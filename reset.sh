#!/bin/bash
# reset.sh - Reset Galaxium Travels repository to pre-demo state
# 
# This script cleans up after completing the demo instructions in DEMO_RUNBOOK.md
# It removes demo branches, resets the database, and cleans build artifacts.
#
# Usage: ./reset.sh [--force]
#   --force: Skip confirmation prompts (use with caution)

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Demo branches to clean up
DEMO_BRANCHES=("demo/missing-validation" "demo/off-by-one" "demo/missing-tests")

# Track what was cleaned
CLEANED_ITEMS=()

# Parse arguments
FORCE_MODE=false
if [[ "$1" == "--force" ]]; then
    FORCE_MODE=true
fi

# Helper functions
print_header() {
    echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

confirm() {
    if [[ "$FORCE_MODE" == true ]]; then
        return 0
    fi
    
    local prompt="$1"
    local response
    echo -e "${YELLOW}${prompt}${NC} (y/N): "
    read -r response
    case "$response" in
        [yY][eE][sS]|[yY]) 
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# Banner
clear
print_header "🚀 Galaxium Travels - Demo Reset Script"
echo -e "This script will reset your repository to pre-demo state by:"
echo -e "  ${BLUE}•${NC} Deleting demo branches (local and remote)"
echo -e "  ${BLUE}•${NC} Resetting to main branch"
echo -e "  ${BLUE}•${NC} Cleaning database files"
echo -e "  ${BLUE}•${NC} Removing build artifacts"
echo ""

# Verify we're in the right directory
if [[ ! -f "DEMO_RUNBOOK.md" ]] || [[ ! -d "booking_system_backend" ]]; then
    print_error "This doesn't appear to be the galaxium-travels repository root."
    print_info "Please run this script from the repository root directory."
    exit 1
fi

print_success "Verified repository location"

# Check for uncommitted changes
if [[ -n $(git status --porcelain) ]]; then
    print_warning "You have uncommitted changes in your working directory:"
    git status --short
    echo ""
    if ! confirm "These changes will be discarded. Continue?"; then
        print_info "Reset cancelled. Commit or stash your changes first."
        exit 0
    fi
fi

# Final confirmation
if ! confirm "Ready to reset repository. Continue?"; then
    print_info "Reset cancelled."
    exit 0
fi

# ============================================================================
# GIT CLEANUP
# ============================================================================
print_header "📦 Git Cleanup"

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
print_info "Current branch: ${CURRENT_BRANCH}"

# Switch to main if not already there
if [[ "$CURRENT_BRANCH" != "main" ]]; then
    print_info "Switching to main branch..."
    if git checkout main 2>/dev/null; then
        print_success "Switched to main branch"
        CLEANED_ITEMS+=("Switched to main branch")
    else
        print_error "Failed to switch to main branch"
        print_info "Attempting to fetch and checkout main..."
        git fetch origin main
        git checkout main
        print_success "Switched to main branch"
        CLEANED_ITEMS+=("Switched to main branch")
    fi
else
    print_info "Already on main branch"
fi

# Discard any uncommitted changes
if [[ -n $(git status --porcelain) ]]; then
    print_info "Discarding uncommitted changes..."
    git reset --hard HEAD
    git clean -fd
    print_success "Discarded uncommitted changes"
    CLEANED_ITEMS+=("Discarded uncommitted changes")
fi

# Pull latest from origin/main
print_info "Pulling latest changes from origin/main..."
if git pull origin main 2>/dev/null; then
    print_success "Updated to latest main"
    CLEANED_ITEMS+=("Updated to latest main")
else
    print_warning "Could not pull from origin (might be offline or no remote configured)"
fi

# Delete local demo branches
print_info "Deleting local demo branches..."
for branch in "${DEMO_BRANCHES[@]}"; do
    if git show-ref --verify --quiet "refs/heads/$branch"; then
        git branch -D "$branch" 2>/dev/null || true
        print_success "Deleted local branch: $branch"
        CLEANED_ITEMS+=("Deleted local branch: $branch")
    else
        print_info "Local branch not found: $branch (already clean)"
    fi
done

# Delete remote demo branches
print_info "Deleting remote demo branches..."
for branch in "${DEMO_BRANCHES[@]}"; do
    if git ls-remote --heads origin "$branch" | grep -q "$branch"; then
        if git push origin --delete "$branch" 2>/dev/null; then
            print_success "Deleted remote branch: $branch"
            CLEANED_ITEMS+=("Deleted remote branch: $branch")
        else
            print_warning "Could not delete remote branch: $branch (might not have permission or already deleted)"
        fi
    else
        print_info "Remote branch not found: $branch (already clean)"
    fi
done

# ============================================================================
# DATABASE CLEANUP
# ============================================================================
print_header "🗄️  Database Cleanup"

# Remove SQLite database files
DB_FILES=("booking_system_backend/booking.db" "booking_system_backend/booking.db-journal" "booking.db" "*.db-journal")
for db_file in "${DB_FILES[@]}"; do
    if [[ -f "$db_file" ]]; then
        rm -f "$db_file"
        print_success "Deleted: $db_file"
        CLEANED_ITEMS+=("Deleted database: $db_file")
    fi
done

# Check for any other .db files
if compgen -G "*.db" > /dev/null 2>&1; then
    print_info "Found additional .db files in root:"
    ls -lh *.db
    if confirm "Delete these database files?"; then
        rm -f *.db
        print_success "Deleted additional database files"
        CLEANED_ITEMS+=("Deleted additional database files")
    fi
fi

print_info "Database will be recreated with fresh seed data on next startup"

# ============================================================================
# BUILD ARTIFACTS CLEANUP
# ============================================================================
print_header "🧹 Build Artifacts Cleanup"

# Backend cleanup
print_info "Cleaning backend artifacts..."
BACKEND_CLEANED=0

if [[ -d "booking_system_backend/__pycache__" ]]; then
    rm -rf booking_system_backend/__pycache__
    ((BACKEND_CLEANED++))
fi

if [[ -d "booking_system_backend/.pytest_cache" ]]; then
    rm -rf booking_system_backend/.pytest_cache
    ((BACKEND_CLEANED++))
fi

if [[ -d "booking_system_backend/.venv" ]]; then
    if confirm "Delete backend virtual environment (.venv)?"; then
        rm -rf booking_system_backend/.venv
        ((BACKEND_CLEANED++))
        CLEANED_ITEMS+=("Deleted backend .venv")
    fi
fi

# Find and remove all __pycache__ directories
find booking_system_backend -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find booking_system_backend -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true

if [[ $BACKEND_CLEANED -gt 0 ]]; then
    print_success "Cleaned backend artifacts"
    CLEANED_ITEMS+=("Cleaned backend artifacts")
else
    print_info "Backend already clean"
fi

# Frontend cleanup
print_info "Cleaning frontend artifacts..."
FRONTEND_CLEANED=0

if [[ -d "booking_system_frontend/node_modules" ]]; then
    if confirm "Delete frontend node_modules? (Will need npm install to rebuild)"; then
        rm -rf booking_system_frontend/node_modules
        ((FRONTEND_CLEANED++))
        CLEANED_ITEMS+=("Deleted frontend node_modules")
    fi
fi

if [[ -d "booking_system_frontend/dist" ]]; then
    rm -rf booking_system_frontend/dist
    ((FRONTEND_CLEANED++))
fi

if [[ -d "booking_system_frontend/.vite" ]]; then
    rm -rf booking_system_frontend/.vite
    ((FRONTEND_CLEANED++))
fi

if [[ $FRONTEND_CLEANED -gt 0 ]]; then
    print_success "Cleaned frontend artifacts"
    CLEANED_ITEMS+=("Cleaned frontend artifacts")
else
    print_info "Frontend already clean"
fi

# Java service cleanup
if [[ -d "booking_system_inventory_hold_service/target" ]]; then
    print_info "Cleaning Java service artifacts..."
    rm -rf booking_system_inventory_hold_service/target
    print_success "Cleaned Java service artifacts"
    CLEANED_ITEMS+=("Cleaned Java service artifacts")
fi

# E2E tests cleanup
if [[ -d "tests_e2e/__pycache__" ]]; then
    rm -rf tests_e2e/__pycache__
fi
if [[ -d "tests_e2e/.pytest_cache" ]]; then
    rm -rf tests_e2e/.pytest_cache
fi

# ============================================================================
# SUMMARY
# ============================================================================
print_header "✨ Reset Complete"

if [[ ${#CLEANED_ITEMS[@]} -eq 0 ]]; then
    print_info "Repository was already in clean state - nothing to reset"
else
    print_success "Successfully cleaned ${#CLEANED_ITEMS[@]} items:"
    for item in "${CLEANED_ITEMS[@]}"; do
        echo -e "  ${GREEN}•${NC} $item"
    done
fi

echo ""
print_info "Repository is now reset to pre-demo state"
print_info "Next steps:"
echo -e "  ${BLUE}1.${NC} Run ${CYAN}./start.sh${NC} to start the application with fresh data"
echo -e "  ${BLUE}2.${NC} Or follow ${CYAN}DEMO_RUNBOOK.md${NC} to run the demo again"
echo ""

print_success "Done! 🚀"