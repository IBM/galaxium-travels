#!/usr/bin/env bash

# Quick status check for IBM Cloud deployment

echo "Checking IBM Cloud login status..."
if ! ibmcloud target >/dev/null 2>&1; then
    echo "❌ Not logged in to IBM Cloud"
    echo ""
    echo "Please login:"
    echo "  ibmcloud login --sso"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo "✓ Logged in to IBM Cloud"
echo ""

# Target environment
ibmcloud target -r us-south -g max_jesch_rg >/dev/null 2>&1
ibmcloud ce project select -n galaxium-travel-services-maxjesch >/dev/null 2>&1

echo "📋 Application Status:"
echo "===================="
ibmcloud ce application list

echo ""
echo "🔗 Your Application URLs:"
echo "========================"

# Get URLs
BACKEND_URL=$(ibmcloud ce application get -n galaxium-backend --output json 2>/dev/null | jq -r '.status.url // "Not deployed"')
FRONTEND_URL=$(ibmcloud ce application get -n galaxium-frontend --output json 2>/dev/null | jq -r '.status.url // "Not deployed"')
JAVA_URL=$(ibmcloud ce application get -n galaxium-hold-service --output json 2>/dev/null | jq -r '.status.url // "Not deployed"')

echo "Frontend:     $FRONTEND_URL"
echo "Backend:      $BACKEND_URL"
echo "Java Service: $JAVA_URL"
echo ""

# Check if apps are ready
echo "📊 Deployment Status:"
echo "===================="
BACKEND_STATUS=$(ibmcloud ce application get -n galaxium-backend --output json 2>/dev/null | jq -r '.status.conditions[] | select(.type=="Ready") | .status // "Unknown"')
FRONTEND_STATUS=$(ibmcloud ce application get -n galaxium-frontend --output json 2>/dev/null | jq -r '.status.conditions[] | select(.type=="Ready") | .status // "Unknown"')
JAVA_STATUS=$(ibmcloud ce application get -n galaxium-hold-service --output json 2>/dev/null | jq -r '.status.conditions[] | select(.type=="Ready") | .status // "Unknown"')

echo "Backend:      $BACKEND_STATUS"
echo "Frontend:     $FRONTEND_STATUS"
echo "Java Service: $JAVA_STATUS"
echo ""

if [ "$FRONTEND_STATUS" != "True" ]; then
    echo "⚠️  Frontend is not deployed yet"
    echo ""
    echo "To deploy all services, run:"
    echo "  ./deploy-to-ibm.sh"
fi

# Made with Bob
