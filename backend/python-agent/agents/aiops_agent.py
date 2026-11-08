"""
AIOps Agent - AI agent for incident management with LLM + API fallback
Provides operational capabilities similar to Roo Code MCP integration
"""
import os
import re
from typing import Dict, Any, List, Optional, AsyncGenerator
from datetime import datetime, timedelta

from mcp.pagerduty_client import PagerDutyMCPClient
from config.services_config import (
    ALLOWED_SERVICES,
    ALLOWED_TEAM,
    get_allowed_service_ids,
    get_allowed_service_names,
    get_team_id,
    get_team_name
)


class AIOpsAgent:
    """AI-powered operations agent for PagerDuty incident management
    
    Supports two modes:
    1. LLM Mode - Uses LangChain with OpenAI-compatible LLM for natural language processing
    2. API Mode - Direct API calls with rule-based command processing (fallback)
    """
    
    def __init__(self, mcp_client: PagerDutyMCPClient):
        self.mcp_client = mcp_client
        self.conversations: Dict[str, List[Dict]] = {}
        self.llm = None
        self.agent = None
        self.use_llm = False
        self.llm_error_count = 0
        self.max_llm_errors = 3  # Switch to API mode after 3 consecutive errors
        
        # Try to initialize LLM if configured
        self._try_init_llm()
    
    def _try_init_llm(self):
        """Try to initialize the LLM, fallback to API mode if not available"""
        api_key = os.getenv("OPENAI_API_KEY")
        api_base = os.getenv("OPENAI_API_BASE")
        
        if not api_key or api_key == "your-api-key-here":
            print("⚠️  LLM not configured - using API mode with rule-based processing")
            self.use_llm = False
            return
        
        try:
            from langchain_openai import ChatOpenAI
            from langchain.agents import AgentExecutor, create_openai_functions_agent
            from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
            from langchain.tools import Tool
            
            self.llm = ChatOpenAI(
                base_url=api_base or "https://api.openai.com/v1",
                api_key=api_key,
                model=os.getenv("OPENAI_MODEL", "gpt-4"),
                temperature=0.1,
                timeout=60,
                max_retries=2
            )
            
            # Create agent with tools
            self._create_langchain_agent()
            self.use_llm = True
            print("✅ LLM Agent initialized successfully")
            
        except ImportError as e:
            print(f"⚠️  LangChain not available: {e} - using API mode")
            self.use_llm = False
        except Exception as e:
            print(f"⚠️  LLM initialization failed: {e} - using API mode")
            self.use_llm = False
    
    def _create_langchain_agent(self):
        """Create LangChain agent with comprehensive PagerDuty tools"""
        if not self.llm:
            return
            
        from langchain.agents import AgentExecutor, create_openai_functions_agent
        from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
        from langchain.tools import Tool
        
        # Create comprehensive tools
        tools = self._create_comprehensive_tools()
        
        # Create system prompt
        service_names = ", ".join(get_allowed_service_names())
        team_name = get_team_name()
        
        system_prompt = f"""You are an expert AIOps Assistant for the {team_name} team, similar to how Roo Code operates with MCP.

You have access to PagerDuty for incident management and operations.

**Your Responsibilities:**
- Monitor and manage incidents for: {service_names}
- Provide real-time incident status and analysis
- Execute operational actions (acknowledge, resolve, escalate)
- Answer questions about services, on-call schedules, and team operations

**Guidelines:**
1. Always fetch real-time data using your tools before answering
2. Be proactive in suggesting actions for critical incidents
3. Provide clear, structured responses with relevant details
4. For actions (acknowledge, resolve), confirm success or report errors
5. Use markdown formatting for better readability
6. When listing incidents, group by status and urgency

**Available Operations:**
- List/search incidents with filters
- Get detailed incident information including log entries
- Acknowledge incidents
- Resolve incidents with resolution notes
- Add notes to incidents
- List services and their status
- Get on-call schedules
- List team members
- Get escalation policies

Always be helpful, accurate, and action-oriented."""
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad")
        ])
        
        agent = create_openai_functions_agent(self.llm, tools, prompt)
        
        self.agent = AgentExecutor(
            agent=agent,
            tools=tools,
            verbose=os.getenv("DEBUG", "false").lower() == "true",
            handle_parsing_errors=True,
            max_iterations=10,
            return_intermediate_steps=True
        )
    
    def _create_comprehensive_tools(self) -> List:
        """Create comprehensive LangChain tools for all PagerDuty operations"""
        from langchain.tools import Tool
        
        tools = []
        
        # ============== Incident Tools ==============
        
        async def list_incidents_func(query: str = "") -> str:
            """List incidents with optional filters. Query can include: 'triggered', 'acknowledged', 'resolved', 'high', 'low'"""
            return await self._list_incidents(query)
        
        tools.append(Tool(
            name="list_incidents",
            description="List PagerDuty incidents. Optionally filter by status (triggered/acknowledged/resolved) or urgency (high/low). Returns incidents sorted by most recent.",
            func=lambda x: None,
            coroutine=list_incidents_func
        ))
        
        async def get_incident_details_func(incident_id: str) -> str:
            """Get comprehensive details for a specific incident"""
            return await self._get_incident_details(incident_id.strip())
        
        tools.append(Tool(
            name="get_incident_details",
            description="Get detailed information about a specific incident by ID. Includes title, status, service, description, assignees, and timeline.",
            func=lambda x: None,
            coroutine=get_incident_details_func
        ))
        
        async def get_incident_timeline_func(incident_id: str) -> str:
            """Get log entries/timeline for an incident"""
            return await self._get_incident_timeline(incident_id.strip())
        
        tools.append(Tool(
            name="get_incident_timeline",
            description="Get the timeline/log entries for an incident showing all events and actions taken.",
            func=lambda x: None,
            coroutine=get_incident_timeline_func
        ))
        
        async def acknowledge_incident_func(incident_id: str) -> str:
            """Acknowledge an incident"""
            return await self._acknowledge_incident(incident_id.strip())
        
        tools.append(Tool(
            name="acknowledge_incident",
            description="Acknowledge a triggered incident to indicate someone is working on it. Input: incident ID (e.g., PXXXXXX)",
            func=lambda x: None,
            coroutine=acknowledge_incident_func
        ))
        
        async def resolve_incident_func(params: str) -> str:
            """Resolve an incident. Params format: 'incident_id' or 'incident_id|resolution note'"""
            parts = params.split("|")
            incident_id = parts[0].strip()
            resolution = parts[1].strip() if len(parts) > 1 else ""
            return await self._resolve_incident(incident_id, resolution)
        
        tools.append(Tool(
            name="resolve_incident",
            description="Resolve an incident. Input format: 'incident_id' or 'incident_id|resolution note'. Example: 'PXXXXXX|Fixed by restarting service'",
            func=lambda x: None,
            coroutine=resolve_incident_func
        ))
        
        async def add_incident_note_func(params: str) -> str:
            """Add a note to an incident. Params format: 'incident_id|note content'"""
            parts = params.split("|", 1)
            if len(parts) < 2:
                return "Error: Please provide both incident ID and note content in format: 'incident_id|note content'"
            return await self._add_incident_note(parts[0].strip(), parts[1].strip())
        
        tools.append(Tool(
            name="add_incident_note",
            description="Add a note to an incident. Input format: 'incident_id|note content'. Example: 'PXXXXXX|Investigating root cause'",
            func=lambda x: None,
            coroutine=add_incident_note_func
        ))
        
        async def get_related_incidents_func(incident_id: str) -> str:
            """Get related incidents"""
            return await self._get_related_incidents(incident_id.strip())
        
        tools.append(Tool(
            name="get_related_incidents",
            description="Find incidents related to a specific incident. Useful for identifying patterns or cascading failures.",
            func=lambda x: None,
            coroutine=get_related_incidents_func
        ))
        
        # ============== Service Tools ==============
        
        async def list_services_func(query: str = "") -> str:
            """List monitored services and their status"""
            return await self._list_services()
        
        tools.append(Tool(
            name="list_services",
            description="List all monitored PagerDuty services and their current status.",
            func=lambda x: None,
            coroutine=list_services_func
        ))
        
        async def get_service_details_func(service_id: str) -> str:
            """Get detailed service information"""
            return await self._get_service_details(service_id.strip())
        
        tools.append(Tool(
            name="get_service_details",
            description="Get detailed information about a specific service including status, escalation policy, and integrations.",
            func=lambda x: None,
            coroutine=get_service_details_func
        ))
        
        # ============== On-Call & Team Tools ==============
        
        async def get_oncalls_func(query: str = "") -> str:
            """Get current on-call schedule"""
            return await self._get_oncalls()
        
        tools.append(Tool(
            name="get_oncalls",
            description="Get current on-call schedule showing who is on-call for each schedule/service.",
            func=lambda x: None,
            coroutine=get_oncalls_func
        ))
        
        async def list_team_members_func(query: str = "") -> str:
            """List team members"""
            return await self._list_team_members()
        
        tools.append(Tool(
            name="list_team_members",
            description="List members of the team with their roles and contact information.",
            func=lambda x: None,
            coroutine=list_team_members_func
        ))
        
        async def list_escalation_policies_func(query: str = "") -> str:
            """List escalation policies"""
            return await self._list_escalation_policies()
        
        tools.append(Tool(
            name="list_escalation_policies",
            description="List escalation policies showing how incidents are escalated through the team.",
            func=lambda x: None,
            coroutine=list_escalation_policies_func
        ))
        
        # ============== Summary & Analysis Tools ==============
        
        async def get_summary_func(query: str = "") -> str:
            """Get overall operations summary"""
            return await self._get_operations_summary()
        
        tools.append(Tool(
            name="get_operations_summary",
            description="Get an overall summary of current operations including incident counts, service health, and who's on-call.",
            func=lambda x: None,
            coroutine=get_summary_func
        ))
        
        return tools
    
    # ============== Core API Methods ==============
    
    async def _list_incidents(self, filter_query: str = "") -> str:
        """List incidents with optional filters"""
        try:
            allowed_service_ids = get_allowed_service_ids()
            team_id = get_team_id()
            
            # Get last 10 days of data
            since = (datetime.utcnow() - timedelta(days=10)).isoformat() + "Z"
            
            params = {
                "limit": 50,
                "service_ids": allowed_service_ids,
                "team_ids": [team_id],
                "sort_by": "created_at:desc",
                "since": since
            }
            
            # Apply filters based on query
            filter_lower = filter_query.lower()
            if "triggered" in filter_lower:
                params["statuses"] = ["triggered"]
            elif "acknowledged" in filter_lower or "ack" in filter_lower:
                params["statuses"] = ["acknowledged"]
            elif "resolved" in filter_lower:
                params["statuses"] = ["resolved"]
            elif "open" in filter_lower:
                params["statuses"] = ["triggered", "acknowledged"]
            
            if "high" in filter_lower:
                params["urgencies"] = ["high"]
            elif "low" in filter_lower:
                params["urgencies"] = ["low"]
            
            result = await self.mcp_client.execute_tool("list_incidents", params)
            
            incidents = result.get("incidents", [])
            if not incidents:
                return f"✅ No incidents found for {get_team_name()} team in the last 10 days."
            
            # Categorize by status
            triggered = [i for i in incidents if i.get('status') == 'triggered']
            acknowledged = [i for i in incidents if i.get('status') == 'acknowledged']
            resolved = [i for i in incidents if i.get('status') == 'resolved']
            
            output = f"📊 **Incident Summary for {get_team_name()}**\n"
            output += f"*Last updated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC*\n\n"
            
            if triggered:
                output += f"### 🔴 Triggered ({len(triggered)})\n"
                for inc in triggered[:10]:
                    urgency_emoji = "🔥" if inc.get('urgency') == 'high' else "⚠️"
                    created = inc.get('created_at', '')[:16].replace('T', ' ')
                    output += f"{urgency_emoji} **{inc.get('title', 'No title')[:60]}**\n"
                    output += f"   `{inc.get('id')}` | {inc.get('service', {}).get('summary', 'Unknown')} | {created}\n"
                output += "\n"
            
            if acknowledged:
                output += f"### 🟡 Acknowledged ({len(acknowledged)})\n"
                for inc in acknowledged[:5]:
                    output += f"• **{inc.get('title', 'No title')[:50]}**\n"
                    output += f"  `{inc.get('id')}` | {inc.get('service', {}).get('summary', 'Unknown')}\n"
                output += "\n"
            
            if resolved:
                output += f"### 🟢 Recently Resolved ({len(resolved)})\n"
                for inc in resolved[:5]:
                    output += f"• {inc.get('title', 'No title')[:50]} (`{inc.get('id')}`)\n"
            
            # Summary stats
            output += f"\n---\n**Total:** {len(incidents)} incidents | "
            output += f"Triggered: {len(triggered)} | Acknowledged: {len(acknowledged)} | Resolved: {len(resolved)}"
            
            return output
            
        except Exception as e:
            return f"❌ Error listing incidents: {str(e)}"
    
    async def _get_incident_details(self, incident_id: str) -> str:
        """Get comprehensive incident details"""
        try:
            result = await self.mcp_client.execute_tool("get_incident_details", {"incident_id": incident_id})
            incident = result.get("incident", result)
            
            status_emoji = {"triggered": "🔴", "acknowledged": "🟡", "resolved": "🟢"}.get(incident.get('status'), "⚪")
            urgency_emoji = "🔥" if incident.get('urgency') == 'high' else "📋"
            
            output = f"## {status_emoji} Incident Details\n\n"
            output += f"**Title:** {incident.get('title', 'N/A')}\n"
            output += f"**ID:** `{incident.get('id', 'N/A')}`\n"
            output += f"**Status:** {incident.get('status', 'N/A').upper()}\n"
            output += f"**Urgency:** {urgency_emoji} {incident.get('urgency', 'N/A').upper()}\n"
            output += f"**Service:** {incident.get('service', {}).get('summary', 'N/A')}\n"
            output += f"**Created:** {incident.get('created_at', 'N/A')}\n"
            output += f"**Last Updated:** {incident.get('last_status_change_at', 'N/A')}\n"
            
            if incident.get('description'):
                output += f"\n**Description:**\n> {incident.get('description')}\n"
            
            if incident.get("assignments"):
                assignees = [a.get('assignee', {}).get('summary', 'Unknown') for a in incident.get('assignments', [])]
                output += f"\n**Assigned to:** {', '.join(assignees)}\n"
            
            if incident.get('escalation_policy'):
                output += f"**Escalation Policy:** {incident.get('escalation_policy', {}).get('summary', 'N/A')}\n"
            
            # Add action hints
            if incident.get('status') == 'triggered':
                output += f"\n💡 *Actions available: acknowledge, resolve, add note*"
            elif incident.get('status') == 'acknowledged':
                output += f"\n💡 *Actions available: resolve, add note*"
            
            return output
            
        except Exception as e:
            return f"❌ Error getting incident details: {str(e)}"
    
    async def _get_incident_timeline(self, incident_id: str) -> str:
        """Get incident log entries/timeline"""
        try:
            result = await self.mcp_client.execute_tool("get_incident_log_entries", {"incident_id": incident_id})
            log_entries = result.get("log_entries", [])
            
            if not log_entries:
                return f"No timeline entries found for incident `{incident_id}`"
            
            output = f"## 📜 Incident Timeline: `{incident_id}`\n\n"
            
            for entry in log_entries[:15]:  # Last 15 entries
                created = entry.get('created_at', '')[:19].replace('T', ' ')
                entry_type = entry.get('type', 'unknown').replace('_', ' ').title()
                agent = entry.get('agent', {}).get('summary', 'System')
                
                output += f"**{created}** - {entry_type}\n"
                output += f"   By: {agent}\n"
                if entry.get('channel', {}).get('type'):
                    output += f"   Via: {entry.get('channel', {}).get('type')}\n"
                output += "\n"
            
            return output
            
        except Exception as e:
            return f"❌ Error getting timeline: {str(e)}"
    
    async def _acknowledge_incident(self, incident_id: str) -> str:
        """Acknowledge an incident"""
        try:
            await self.mcp_client.execute_tool("acknowledge_incident", {"incident_id": incident_id})
            return f"✅ Successfully acknowledged incident `{incident_id}`\n\nThe incident status has been changed to 'acknowledged'. You can now work on resolving the issue."
        except Exception as e:
            return f"❌ Error acknowledging incident: {str(e)}"
    
    async def _resolve_incident(self, incident_id: str, resolution: str = "") -> str:
        """Resolve an incident"""
        try:
            params = {"incident_id": incident_id}
            if resolution:
                params["resolution"] = resolution
            await self.mcp_client.execute_tool("resolve_incident", params)
            
            msg = f"✅ Successfully resolved incident `{incident_id}`"
            if resolution:
                msg += f"\n\n**Resolution:** {resolution}"
            return msg
        except Exception as e:
            return f"❌ Error resolving incident: {str(e)}"
    
    async def _add_incident_note(self, incident_id: str, content: str) -> str:
        """Add a note to an incident"""
        try:
            await self.mcp_client.execute_tool("add_incident_note", {
                "incident_id": incident_id,
                "content": content
            })
            return f"✅ Note added to incident `{incident_id}`\n\n> {content}"
        except Exception as e:
            return f"❌ Error adding note: {str(e)}"
    
    async def _get_related_incidents(self, incident_id: str) -> str:
        """Get related incidents"""
        try:
            result = await self.mcp_client.execute_tool("get_related_incidents", {"incident_id": incident_id})
            related = result.get("related_incidents", [])
            
            if not related:
                return f"No related incidents found for `{incident_id}`"
            
            output = f"## 🔗 Related Incidents for `{incident_id}`\n\n"
            for inc in related[:10]:
                output += f"• **{inc.get('title', 'No title')}**\n"
                output += f"  `{inc.get('id')}` | Status: {inc.get('status')}\n"
            
            return output
            
        except Exception as e:
            return f"❌ Error getting related incidents: {str(e)}"
    
    async def _list_services(self) -> str:
        """List monitored services"""
        try:
            allowed_service_ids = get_allowed_service_ids()
            services = []
            
            for service_id in allowed_service_ids:
                try:
                    result = await self.mcp_client.execute_tool("get_service", {"service_id": service_id})
                    if result.get("service"):
                        services.append(result["service"])
                except Exception as e:
                    print(f"Warning: Could not fetch service {service_id}: {e}")
            
            if not services:
                return "No monitored services available."
            
            output = f"## 🔧 Monitored Services - {get_team_name()}\n\n"
            
            for svc in services:
                status = svc.get('status', 'unknown')
                status_emoji = "🟢" if status == 'active' else "🔴" if status == 'disabled' else "🟡"
                
                output += f"{status_emoji} **{svc.get('name', 'Unknown')}**\n"
                output += f"   ID: `{svc.get('id')}` | Status: {status}\n"
                if svc.get('description'):
                    output += f"   {svc.get('description')[:80]}...\n"
                output += "\n"
            
            return output
            
        except Exception as e:
            return f"❌ Error listing services: {str(e)}"
    
    async def _get_service_details(self, service_id: str) -> str:
        """Get detailed service information"""
        try:
            result = await self.mcp_client.execute_tool("get_service", {"service_id": service_id})
            svc = result.get("service", {})
            
            output = f"## 🔧 Service Details\n\n"
            output += f"**Name:** {svc.get('name', 'N/A')}\n"
            output += f"**ID:** `{svc.get('id', 'N/A')}`\n"
            output += f"**Status:** {svc.get('status', 'N/A')}\n"
            output += f"**Description:** {svc.get('description', 'N/A')}\n"
            
            if svc.get('escalation_policy'):
                output += f"**Escalation Policy:** {svc.get('escalation_policy', {}).get('summary', 'N/A')}\n"
            
            if svc.get('teams'):
                teams = [t.get('summary', 'Unknown') for t in svc.get('teams', [])]
                output += f"**Teams:** {', '.join(teams)}\n"
            
            return output
            
        except Exception as e:
            return f"❌ Error getting service details: {str(e)}"
    
    async def _get_oncalls(self) -> str:
        """Get on-call information"""
        try:
            result = await self.mcp_client.execute_tool("list_oncalls", {})
            oncalls = result.get("oncalls", [])
            
            if not oncalls:
                return "No on-call information available."
            
            output = "## 👤 Current On-Call Schedule\n\n"
            seen = set()
            
            for oc in oncalls[:15]:
                user = oc.get('user', {}).get('summary', 'Unknown')
                schedule = oc.get('schedule', {}).get('summary', 'Unknown')
                escalation = oc.get('escalation_policy', {}).get('summary', '')
                level = oc.get('escalation_level', 1)
                
                key = f"{user}-{schedule}"
                if key not in seen:
                    seen.add(key)
                    output += f"• **{user}**\n"
                    output += f"  Schedule: {schedule}\n"
                    if escalation:
                        output += f"  Policy: {escalation} (Level {level})\n"
                    output += "\n"
            
            return output
            
        except Exception as e:
            return f"❌ Error getting on-call info: {str(e)}"
    
    async def _list_team_members(self) -> str:
        """List team members"""
        try:
            team_id = get_team_id()
            result = await self.mcp_client.execute_tool("list_team_members", {"team_id": team_id})
            members = result.get("members", [])
            
            if not members:
                return f"No members found for team {get_team_name()}"
            
            output = f"## 👥 Team Members - {get_team_name()}\n\n"
            
            for member in members[:20]:
                user = member.get('user', {})
                output += f"• **{user.get('summary', 'Unknown')}**\n"
                output += f"  Role: {member.get('role', 'member')}\n"
            
            return output
            
        except Exception as e:
            return f"❌ Error listing team members: {str(e)}"
    
    async def _list_escalation_policies(self) -> str:
        """List escalation policies"""
        try:
            result = await self.mcp_client.execute_tool("list_escalation_policies", {"limit": 20})
            policies = result.get("escalation_policies", [])
            
            if not policies:
                return "No escalation policies found."
            
            output = "## 📋 Escalation Policies\n\n"
            
            for policy in policies[:10]:
                output += f"• **{policy.get('name', 'Unknown')}**\n"
                output += f"  ID: `{policy.get('id')}`\n"
                if policy.get('description'):
                    output += f"  {policy.get('description')[:60]}...\n"
                output += "\n"
            
            return output
            
        except Exception as e:
            return f"❌ Error listing escalation policies: {str(e)}"
    
    async def _get_operations_summary(self) -> str:
        """Get overall operations summary"""
        try:
            # Get incidents
            allowed_service_ids = get_allowed_service_ids()
            team_id = get_team_id()
            since = (datetime.utcnow() - timedelta(days=1)).isoformat() + "Z"
            
            triggered_result = await self.mcp_client.execute_tool("list_incidents", {
                "statuses": ["triggered"],
                "service_ids": allowed_service_ids,
                "team_ids": [team_id],
                "limit": 100
            })
            
            ack_result = await self.mcp_client.execute_tool("list_incidents", {
                "statuses": ["acknowledged"],
                "service_ids": allowed_service_ids,
                "team_ids": [team_id],
                "limit": 100
            })
            
            triggered = triggered_result.get("incidents", [])
            acknowledged = ack_result.get("incidents", [])
            
            # Get on-call
            oncall_result = await self.mcp_client.execute_tool("list_oncalls", {})
            oncalls = oncall_result.get("oncalls", [])
            
            output = f"## 📊 Operations Summary - {get_team_name()}\n"
            output += f"*{datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC*\n\n"
            
            output += "### Incident Status\n"
            output += f"🔴 **Triggered:** {len(triggered)}\n"
            output += f"🟡 **Acknowledged:** {len(acknowledged)}\n"
            output += f"📊 **Total Open:** {len(triggered) + len(acknowledged)}\n\n"
            
            if triggered:
                high_urgency = [i for i in triggered if i.get('urgency') == 'high']
                if high_urgency:
                    output += f"🔥 **High Urgency Triggered:** {len(high_urgency)}\n\n"
            
            output += "### On-Call\n"
            seen = set()
            for oc in oncalls[:3]:
                user = oc.get('user', {}).get('summary', 'Unknown')
                if user not in seen:
                    seen.add(user)
                    output += f"• {user}\n"
            
            output += f"\n### Monitored Services\n"
            output += f"{', '.join(get_allowed_service_names())}\n"
            
            return output
            
        except Exception as e:
            return f"❌ Error getting summary: {str(e)}"
    
    # ============== Chat Methods ==============
    
    async def chat(self, message: str, conversation_id: str) -> Dict[str, Any]:
        """Process a chat message and return response"""
        
        # Store message in conversation history
        if conversation_id not in self.conversations:
            self.conversations[conversation_id] = []
        self.conversations[conversation_id].append({"role": "user", "content": message})
        
        try:
            # Try LLM-based agent first if available
            if self.use_llm and self.agent and self.llm_error_count < self.max_llm_errors:
                result = await self._chat_with_llm(message, conversation_id)
                if not result.get("error"):
                    self.llm_error_count = 0  # Reset error count on success
                    return result
                else:
                    self.llm_error_count += 1
                    if self.llm_error_count >= self.max_llm_errors:
                        print(f"⚠️ LLM failed {self.max_llm_errors} times, switching to API mode")
            
            # Fallback to rule-based API mode
            return await self._chat_api_mode(message, conversation_id)
            
        except Exception as e:
            error_msg = f"❌ Error processing request: {str(e)}"
            return {
                "response": error_msg,
                "tools_used": [],
                "error": str(e)
            }
    
    async def _chat_with_llm(self, message: str, conversation_id: str) -> Dict[str, Any]:
        """Chat using LLM agent"""
        try:
            history = self.conversations.get(conversation_id, [])[:-1]
            chat_history = []
            
            for msg in history[-10:]:
                if msg["role"] == "user":
                    chat_history.append({"role": "human", "content": msg["content"]})
                else:
                    chat_history.append({"role": "ai", "content": msg["content"]})
            
            result = await self.agent.ainvoke({
                "input": message,
                "chat_history": chat_history
            })
            
            response = result.get("output", "I couldn't process your request.")
            
            # Store response
            self.conversations[conversation_id].append({"role": "assistant", "content": response})
            
            tools_used = []
            if "intermediate_steps" in result:
                for step in result["intermediate_steps"]:
                    if hasattr(step[0], "tool"):
                        tools_used.append(step[0].tool)
            
            return {
                "response": response,
                "tools_used": tools_used
            }
            
        except Exception as e:
            return {
                "response": "",
                "tools_used": [],
                "error": str(e)
            }
    
    async def _chat_api_mode(self, message: str, conversation_id: str) -> Dict[str, Any]:
        """API mode with rule-based command processing"""
        message_lower = message.lower()
        tools_used = []
        
        try:
            # Pattern matching for commands
            
            # Help
            if any(word in message_lower for word in ['help', 'what can you do', 'capabilities', 'commands']):
                response = self._get_help_text()
            
            # Operations summary
            elif any(word in message_lower for word in ['summary', 'overview', 'status overall', 'dashboard']):
                response = await self._get_operations_summary()
                tools_used = ["get_operations_summary"]
            
            # Incident details by ID
            elif re.search(r'(detail|info|show|get).*(P[A-Z0-9]{6,})', message, re.IGNORECASE):
                match = re.search(r'P[A-Z0-9]{6,}', message, re.IGNORECASE)
                if match:
                    response = await self._get_incident_details(match.group(0))
                    tools_used = ["get_incident_details"]
                else:
                    response = await self._list_incidents()
                    tools_used = ["list_incidents"]
            
            # Timeline/log entries
            elif 'timeline' in message_lower or 'log' in message_lower:
                match = re.search(r'P[A-Z0-9]{6,}', message, re.IGNORECASE)
                if match:
                    response = await self._get_incident_timeline(match.group(0))
                    tools_used = ["get_incident_timeline"]
                else:
                    response = "Please provide an incident ID. Example: 'timeline for PXXXXXX'"
            
            # Acknowledge
            elif 'acknowledge' in message_lower or 'ack ' in message_lower:
                match = re.search(r'P[A-Z0-9]{6,}', message, re.IGNORECASE)
                if match:
                    response = await self._acknowledge_incident(match.group(0))
                    tools_used = ["acknowledge_incident"]
                else:
                    response = "Please provide an incident ID. Example: 'acknowledge PXXXXXX'"
            
            # Resolve
            elif 'resolve' in message_lower:
                match = re.search(r'P[A-Z0-9]{6,}', message, re.IGNORECASE)
                if match:
                    incident_id = match.group(0)
                    # Try to extract resolution note
                    resolution = ""
                    if 'with' in message_lower or 'note' in message_lower:
                        parts = re.split(r'with|note[:\s]', message, flags=re.IGNORECASE)
                        if len(parts) > 1:
                            resolution = parts[-1].strip()
                    response = await self._resolve_incident(incident_id, resolution)
                    tools_used = ["resolve_incident"]
                else:
                    response = "Please provide an incident ID. Example: 'resolve PXXXXXX with Fixed the issue'"
            
            # Add note
            elif 'add note' in message_lower or 'note to' in message_lower:
                match = re.search(r'P[A-Z0-9]{6,}', message, re.IGNORECASE)
                if match:
                    incident_id = match.group(0)
                    note_match = re.search(r'(?:note[:\s]+|with[:\s]+)(.+)', message, re.IGNORECASE)
                    if note_match:
                        response = await self._add_incident_note(incident_id, note_match.group(1).strip())
                        tools_used = ["add_incident_note"]
                    else:
                        response = "Please provide the note content. Example: 'add note to PXXXXXX: Investigating issue'"
                else:
                    response = "Please provide an incident ID. Example: 'add note to PXXXXXX: Your note here'"
            
            # List incidents
            elif any(word in message_lower for word in ['incident', 'incidents', 'alert', 'alerts', 'critical', 'triggered']):
                filter_query = ""
                if 'triggered' in message_lower:
                    filter_query = "triggered"
                elif 'acknowledged' in message_lower or 'ack' in message_lower:
                    filter_query = "acknowledged"
                elif 'resolved' in message_lower:
                    filter_query = "resolved"
                elif 'open' in message_lower:
                    filter_query = "open"
                elif 'high' in message_lower or 'critical' in message_lower:
                    filter_query = "high"
                
                response = await self._list_incidents(filter_query)
                tools_used = ["list_incidents"]
            
            # Services
            elif any(word in message_lower for word in ['service', 'services']):
                match = re.search(r'P[A-Z0-9]{6,}', message, re.IGNORECASE)
                if match:
                    response = await self._get_service_details(match.group(0))
                    tools_used = ["get_service_details"]
                else:
                    response = await self._list_services()
                    tools_used = ["list_services"]
            
            # On-call
            elif any(word in message_lower for word in ['on-call', 'oncall', 'on call', 'who is', "who's"]):
                response = await self._get_oncalls()
                tools_used = ["get_oncalls"]
            
            # Team
            elif 'team' in message_lower and ('member' in message_lower or 'who' in message_lower):
                response = await self._list_team_members()
                tools_used = ["list_team_members"]
            
            # Escalation
            elif 'escalation' in message_lower or 'policy' in message_lower:
                response = await self._list_escalation_policies()
                tools_used = ["list_escalation_policies"]
            
            # Related incidents
            elif 'related' in message_lower:
                match = re.search(r'P[A-Z0-9]{6,}', message, re.IGNORECASE)
                if match:
                    response = await self._get_related_incidents(match.group(0))
                    tools_used = ["get_related_incidents"]
                else:
                    response = "Please provide an incident ID. Example: 'related incidents for PXXXXXX'"
            
            # Default - show summary
            else:
                response = await self._get_operations_summary()
                response += "\n\n💡 *Type 'help' to see all available commands.*"
                tools_used = ["get_operations_summary"]
            
            # Store response
            self.conversations[conversation_id].append({"role": "assistant", "content": response})
            
            return {
                "response": response,
                "tools_used": tools_used
            }
            
        except Exception as e:
            return {
                "response": f"❌ Error: {str(e)}",
                "tools_used": tools_used,
                "error": str(e)
            }
    
    def _get_help_text(self) -> str:
        """Get help text with available commands"""
        return f"""## 🤖 AIOps Assistant - {get_team_name()}

### 📋 Incident Commands
| Command | Description |
|---------|-------------|
| `show incidents` | List all current incidents |
| `show triggered incidents` | List triggered incidents |
| `show acknowledged incidents` | List acknowledged incidents |
| `show high urgency` | List high urgency incidents |
| `details PXXXXXX` | Get incident details |
| `timeline PXXXXXX` | Get incident timeline/logs |
| `acknowledge PXXXXXX` | Acknowledge an incident |
| `resolve PXXXXXX` | Resolve an incident |
| `resolve PXXXXXX with [note]` | Resolve with note |
| `add note to PXXXXXX: [text]` | Add note to incident |
| `related PXXXXXX` | Find related incidents |

### 🔧 Service Commands
| Command | Description |
|---------|-------------|
| `show services` | List monitored services |
| `service details [ID]` | Get service details |

### 👤 Team Commands
| Command | Description |
|---------|-------------|
| `who is on-call?` | Show on-call schedule |
| `team members` | List team members |
| `escalation policies` | Show escalation policies |

### 📊 Overview
| Command | Description |
|---------|-------------|
| `summary` | Operations summary |
| `status` | Overall status |

**Monitored Services:** {', '.join(get_allowed_service_names())}
"""
    
    async def stream_chat(self, message: str, conversation_id: str) -> AsyncGenerator[str, None]:
        """Stream chat response"""
        result = await self.chat(message, conversation_id)
        yield result.get("response", "")
    
    async def execute_query(self, query: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Execute a specific query"""
        conv_id = context.get("conversation_id", "default") if context else "default"
        return await self.chat(query, conv_id)
    
    async def analyze_incident(self, incident_id: str) -> Dict[str, Any]:
        """Analyze a specific incident"""
        try:
            # Get incident details
            incident_result = await self.mcp_client.execute_tool("get_incident_details", {"incident_id": incident_id})
            incident = incident_result.get("incident", {})
            
            # Get log entries
            log_result = await self.mcp_client.execute_tool("get_incident_log_entries", {"incident_id": incident_id})
            log_entries = log_result.get("log_entries", [])
            
            # Get related incidents
            related_result = await self.mcp_client.execute_tool("get_related_incidents", {"incident_id": incident_id})
            related = related_result.get("related_incidents", [])
            
            # Build analysis
            analysis = {
                "incident_id": incident_id,
                "title": incident.get("title"),
                "status": incident.get("status"),
                "urgency": incident.get("urgency"),
                "service": incident.get("service", {}).get("summary"),
                "created_at": incident.get("created_at"),
                "timeline_events": len(log_entries),
                "related_incidents": len(related),
                "recommendations": []
            }
            
            # Generate recommendations
            if incident.get("status") == "triggered":
                analysis["recommendations"].append("⚡ Acknowledge this incident to indicate someone is working on it")
            
            if incident.get("urgency") == "high":
                analysis["recommendations"].append("🔥 High urgency - prioritize resolution")
            
            if len(related) > 0:
                analysis["recommendations"].append(f"🔗 {len(related)} related incidents found - check for patterns")
            
            if len(log_entries) == 1:
                analysis["recommendations"].append("📝 No updates since creation - add a note with investigation status")
            
            return {
                "success": True,
                "analysis": analysis
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
