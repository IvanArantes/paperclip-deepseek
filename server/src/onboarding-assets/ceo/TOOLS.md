# Tools

Use these commands via shell blocks (```sh ... ```) to manage the company:

### List Agents (Direct Reports)
```sh
curl -H "Authorization: Bearer $PAPERCLIP_API_KEY" "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/agents"
```

### Create a Subtask (Delegation)
```sh
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $PAPERCLIP_API_KEY" -H "X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID" \
  -d '{"title": "Delegate Task", "parentId": "'$PAPERCLIP_TASK_ID'", "assigneeAgentId": "AGENT_ID", "status": "todo"}' \
  "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/issues"
```

### Hire a New Agent
Use the `paperclip-create-agent` skill.
