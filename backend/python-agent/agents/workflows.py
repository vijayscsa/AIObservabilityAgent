"""
LangGraph Workflows for AIOps operations
"""
import os
from typing import Dict, Any, List, TypedDict, Annotated
from operator import add
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage


class TriageState(TypedDict):
    """State for triage workflow"""
    incident_ids: List[str]
    incidents: List[Dict[str, Any]]
    analysis: List[Dict[str, Any]]
    recommendations: Annotated[List[Dict[str, Any]], add]
    priority_order: List[str]


class TriageWorkflow:
    """LangGraph workflow for incident triage"""
    
    def __init__(self, agent):
        self.agent = agent
        self.mcp_client = agent.mcp_client
        
        self.llm = ChatOpenAI(
            base_url=os.getenv("OPENAI_API_BASE", "https://api.studio.genai.cbaa"),
            api_key=os.getenv("OPENAI_API_KEY"),
            model=os.getenv("OPENAI_MODEL", "AIPE-bedrock-claude-4-sonnet"),
            temperature=0.1
        )
        
        # Build the workflow graph
        self.graph = self._build_graph()
    
    def _build_graph(self) -> StateGraph:
        """Build the LangGraph workflow"""
        workflow = StateGraph(TriageState)
        
        # Add nodes
        workflow.add_node("fetch_incidents", self._fetch_incidents)
        workflow.add_node("analyze_incidents", self._analyze_incidents)
        workflow.add_node("prioritize", self._prioritize)
        workflow.add_node("generate_recommendations", self._generate_recommendations)
        
        # Add edges
        workflow.set_entry_point("fetch_incidents")
        workflow.add_edge("fetch_incidents", "analyze_incidents")
        workflow.add_edge("analyze_incidents", "prioritize")
        workflow.add_edge("prioritize", "generate_recommendations")
        workflow.add_edge("generate_recommendations", END)
        
        return workflow.compile()
    
    async def _fetch_incidents(self, state: TriageState) -> Dict[str, Any]:
        """Fetch incident details"""
        incidents = []
        for incident_id in state["incident_ids"]:
            try:
                result = await self.mcp_client.execute_tool(
                    "get_incident_details", 
                    {"incident_id": incident_id}
                )
                incident = result.get("incident", result)
                incidents.append(incident)
            except Exception as e:
                incidents.append({
                    "id": incident_id,
                    "error": str(e)
                })
        
        return {"incidents": incidents}
    
    async def _analyze_incidents(self, state: TriageState) -> Dict[str, Any]:
        """Analyze each incident"""
        analysis = []
        
        for incident in state["incidents"]:
            if "error" in incident:
                analysis.append({
                    "incident_id": incident["id"],
                    "error": incident["error"]
                })
                continue
            
            try:
                result = await self.agent.analyze_incident(incident)
                analysis.append(result)
            except Exception as e:
                analysis.append({
                    "incident_id": incident.get("id"),
                    "error": str(e)
                })
        
        return {"analysis": analysis}
    
    async def _prioritize(self, state: TriageState) -> Dict[str, Any]:
        """Determine priority order"""
        incidents = state["incidents"]
        
        # Build context for prioritization
        incident_summaries = []
        for inc in incidents:
            if "error" not in inc:
                incident_summaries.append(
                    f"ID: {inc.get('id')} | Title: {inc.get('title')} | "
                    f"Urgency: {inc.get('urgency')} | Status: {inc.get('status')} | "
                    f"Service: {inc.get('service', {}).get('summary', 'Unknown')}"
                )
        
        if not incident_summaries:
            return {"priority_order": [inc["id"] for inc in incidents if "id" in inc]}
        
        prompt = f"""Given these incidents, determine the optimal order to address them.
Consider: business impact, urgency, dependencies, and time sensitivity.

Incidents:
{chr(10).join(incident_summaries)}

Return ONLY the incident IDs in priority order, one per line, highest priority first."""
        
        try:
            result = await self.llm.ainvoke([
                SystemMessage(content="You are an expert SRE prioritizing incidents."),
                HumanMessage(content=prompt)
            ])
            
            # Parse the response to extract IDs
            lines = result.content.strip().split('\n')
            priority_order = []
            for line in lines:
                # Extract ID from each line
                line = line.strip()
                for inc in incidents:
                    if inc.get("id") and inc["id"] in line:
                        if inc["id"] not in priority_order:
                            priority_order.append(inc["id"])
                        break
            
            # Add any missing IDs at the end
            for inc in incidents:
                if inc.get("id") and inc["id"] not in priority_order:
                    priority_order.append(inc["id"])
            
            return {"priority_order": priority_order}
        except Exception as e:
            # Fallback: order by urgency
            sorted_incidents = sorted(
                incidents,
                key=lambda x: 0 if x.get("urgency") == "high" else 1
            )
            return {"priority_order": [inc["id"] for inc in sorted_incidents if inc.get("id")]}
    
    async def _generate_recommendations(self, state: TriageState) -> Dict[str, Any]:
        """Generate actionable recommendations"""
        recommendations = []
        
        for incident_id in state["priority_order"]:
            # Find the incident and its analysis
            incident = next((i for i in state["incidents"] if i.get("id") == incident_id), None)
            analysis = next((a for a in state["analysis"] if a.get("incident_id") == incident_id), None)
            
            if not incident:
                continue
            
            recommendation = {
                "incident_id": incident_id,
                "title": incident.get("title", "Unknown"),
                "urgency": incident.get("urgency", "unknown"),
                "status": incident.get("status", "unknown"),
                "service": incident.get("service", {}).get("summary", "Unknown"),
                "priority_rank": state["priority_order"].index(incident_id) + 1,
                "analysis": analysis.get("summary") if analysis else None,
                "suggested_actions": []
            }
            
            # Add suggested actions based on status
            if incident.get("status") == "triggered":
                recommendation["suggested_actions"].append("Acknowledge the incident")
            
            if incident.get("urgency") == "high":
                recommendation["suggested_actions"].append("Escalate if not resolved within 15 minutes")
            
            recommendation["suggested_actions"].append("Review logs and metrics")
            recommendation["suggested_actions"].append("Communicate status to stakeholders")
            
            recommendations.append(recommendation)
        
        return {"recommendations": recommendations}
    
    async def run(self, incident_ids: List[str]) -> List[Dict[str, Any]]:
        """Run the triage workflow"""
        initial_state = TriageState(
            incident_ids=incident_ids,
            incidents=[],
            analysis=[],
            recommendations=[],
            priority_order=[]
        )
        
        result = await self.graph.ainvoke(initial_state)
        return result.get("recommendations", [])
