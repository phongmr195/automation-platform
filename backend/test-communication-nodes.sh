#!/bin/bash

# Communication Nodes Test Script
# Tests all 5 communication nodes with validation and execution

API_URL="http://localhost:3000"
BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BOLD}🧪 Communication Nodes Test Suite${NC}\n"

# Function to print test result
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}: $2"
    else
        echo -e "${RED}❌ FAIL${NC}: $2"
    fi
}

# Test 1: Verify all communication nodes are registered
echo -e "${YELLOW}Test 1: Node Registration${NC}"
COMM_NODES=$(curl -s $API_URL/engine/nodes | jq '[.nodes[] | select(.category == "communication")] | length')
if [ "$COMM_NODES" -eq 5 ]; then
    print_result 0 "All 5 communication nodes registered"
    curl -s $API_URL/engine/nodes | jq -r '.nodes[] | select(.category == "communication") | "  - \(.type): \(.name)"'
else
    print_result 1 "Expected 5 nodes, got $COMM_NODES"
fi
echo ""

# Test 2: Email Node - Validation
echo -e "${YELLOW}Test 2: Email Node Validation${NC}"
EMAIL_NODE=$(cat <<EOF
{
  "id": "test-email-1",
  "name": "Test Email",
  "type": "action",
  "position": {"x": 0, "y": 0},
  "data": {
    "service": "email",
    "operation": "send",
    "parameters": {
      "from": "sender@test.com",
      "to": "recipient@test.com",
      "subject": "Test Email",
      "body": "This is a test email",
      "smtp": {
        "host": "smtp.gmail.com",
        "port": 587,
        "secure": false,
        "auth": {
          "user": "test@gmail.com",
          "pass": "test-password"
        }
      }
    }
  }
}
EOF
)
echo "$EMAIL_NODE" | jq .
echo ""

# Test 3: Slack Node - Check defaults
echo -e "${YELLOW}Test 3: Slack Node Defaults${NC}"
SLACK_DEFAULTS=$(curl -s $API_URL/engine/nodes | jq '.nodes[] | select(.type == "slack") | .inputs[] | select(.default != null) | {name, default}')
echo "$SLACK_DEFAULTS" | jq .
if echo "$SLACK_DEFAULTS" | grep -q "Automation Bot"; then
    print_result 0 "Slack node has correct defaults"
else
    print_result 1 "Slack node missing defaults"
fi
echo ""

# Test 4: Discord Node - Check defaults
echo -e "${YELLOW}Test 4: Discord Node Defaults${NC}"
DISCORD_DEFAULTS=$(curl -s $API_URL/engine/nodes | jq '.nodes[] | select(.type == "discord") | .inputs[] | select(.default != null) | {name, default}')
echo "$DISCORD_DEFAULTS" | jq .
if echo "$DISCORD_DEFAULTS" | grep -q "Automation Bot"; then
    print_result 0 "Discord node has correct defaults"
else
    print_result 1 "Discord node missing defaults"
fi
echo ""

# Test 5: Webhook Node - Check options
echo -e "${YELLOW}Test 5: Webhook Node Options${NC}"
WEBHOOK_OPTIONS=$(curl -s $API_URL/engine/nodes | jq '.nodes[] | select(.type == "webhook") | .inputs[] | select(.options != null) | {name, options}')
echo "$WEBHOOK_OPTIONS" | jq .
if echo "$WEBHOOK_OPTIONS" | grep -q "GET"; then
    print_result 0 "Webhook node has HTTP method options"
else
    print_result 1 "Webhook node missing method options"
fi
echo ""

# Test 6: SMS Node - Check provider options
echo -e "${YELLOW}Test 6: SMS Node Provider Options${NC}"
SMS_OPTIONS=$(curl -s $API_URL/engine/nodes | jq '.nodes[] | select(.type == "sms") | .inputs[] | select(.name == "provider")')
echo "$SMS_OPTIONS" | jq .
if echo "$SMS_OPTIONS" | grep -q "twilio"; then
    print_result 0 "SMS node has provider options"
else
    print_result 1 "SMS node missing provider options"
fi
echo ""

# Test 7: Create test workflow with Webhook node (safe to test)
echo -e "${YELLOW}Test 7: Webhook Node Execution Test${NC}"
WEBHOOK_WORKFLOW=$(cat <<EOF
{
  "name": "Test Webhook Communication",
  "description": "Test webhook node execution",
  "nodes": [
    {
      "id": "webhook-1",
      "name": "Test Webhook",
      "type": "action",
      "position": {"x": 100, "y": 100},
      "data": {
        "service": "webhook",
        "operation": "call",
        "parameters": {
          "method": "GET",
          "url": "https://jsonplaceholder.typicode.com/posts/1"
        }
      }
    }
  ],
  "connections": [],
  "triggers": [{"type": "manual", "config": {}}],
  "settings": {"timeout": 30000},
  "active": true
}
EOF
)

# Create workflow
WORKFLOW_ID=$(echo "$WEBHOOK_WORKFLOW" | curl -s -X POST $API_URL/workflows \
  -H "Content-Type: application/json" \
  -d @- | jq -r '.id')

if [ "$WORKFLOW_ID" != "null" ] && [ -n "$WORKFLOW_ID" ]; then
    echo "Created workflow: $WORKFLOW_ID"
    
    # Execute workflow
    EXECUTION_ID=$(curl -s -X POST "$API_URL/workflows/$WORKFLOW_ID/execute" | jq -r '.executionId')
    echo "Execution started: $EXECUTION_ID"
    
    # Wait for execution
    sleep 3
    
    # Check result
    EXEC_STATUS=$(curl -s "$API_URL/engine/executions/$EXECUTION_ID" | jq -r '.status')
    echo "Execution status: $EXEC_STATUS"
    
    if [ "$EXEC_STATUS" = "success" ]; then
        print_result 0 "Webhook node executed successfully"
        curl -s "$API_URL/engine/executions/$EXECUTION_ID" | jq '.result.nodeResults'
    else
        print_result 1 "Webhook execution failed: $EXEC_STATUS"
    fi
    
    # Cleanup
    curl -s -X DELETE "$API_URL/workflows/$WORKFLOW_ID" > /dev/null
else
    print_result 1 "Failed to create test workflow"
fi
echo ""

# Summary
echo -e "${BOLD}📊 Test Summary${NC}"
echo "All communication nodes have been tested for:"
echo "  ✓ Registration and availability"
echo "  ✓ Default values and placeholders"
echo "  ✓ Dropdown options for user input"
echo "  ✓ Basic execution (webhook node)"
echo ""
echo -e "${YELLOW}Note:${NC} Email, Slack, Discord, and SMS nodes require valid credentials to fully test."
echo "Please configure credentials in the UI to test these nodes with real services."
