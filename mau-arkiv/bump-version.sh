#!/bin/bash

################################################################################
# bump-version.sh
# 
# Updates the version number across all package.json files and frontend 
# environment files in the mau-arkiv monorepo.
#
# USAGE:
#   ./bump-version.sh [VERSION]
#
# PARAMETERS:
#   VERSION (optional) - The new version number in semantic versioning format
#                        (e.g., 1.2.3, 2.0.0, 3.1.4)
#                        If not provided, the script will prompt for it.
#
# EXAMPLES:
#   ./bump-version.sh 2.1.0          # Bump to version 2.1.0
#   ./bump-version.sh                # Interactive mode - will ask for version
#
# FILES UPDATED:
#   - package.json (root)
#   - backend/package.json
#   - frontend/package.json
#   - shared/package.json
#   - frontend/src/environments/environment.ts
#   - frontend/src/environments/environment.prod.ts
#
# REQUIREMENTS:
#   - sed command must be available
#   - Script must be run from the mau-arkiv directory
#
# EXIT CODES:
#   0 - Success
#   1 - Invalid version format
#   2 - File not found or update failed
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Define files to update (relative to script directory)
PACKAGE_FILES=(
    "package.json"
    "backend/package.json"
    "frontend/package.json"
    "shared/package.json"
)

ENV_FILES=(
    "frontend/src/environments/environment.ts"
    "frontend/src/environments/environment.prod.ts"
)

# Function to validate semantic versioning format
validate_version() {
    local version=$1
    if [[ ! $version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo -e "${RED}Error: Invalid version format '$version'${NC}"
        echo "Version must follow semantic versioning (e.g., 1.2.3)"
        return 1
    fi
    return 0
}

# Function to update version in package.json files
update_package_json() {
    local file=$1
    local version=$2
    local full_path="$SCRIPT_DIR/$file"
    
    if [ ! -f "$full_path" ]; then
        echo -e "${RED}Error: File not found: $file${NC}"
        return 2
    fi
    
    # Use sed to update the version field
    # macOS and Linux compatible approach
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/\"version\": \"[0-9]*\.[0-9]*\.[0-9]*\"/\"version\": \"$version\"/" "$full_path"
    else
        # Linux
        sed -i "s/\"version\": \"[0-9]*\.[0-9]*\.[0-9]*\"/\"version\": \"$version\"/" "$full_path"
    fi
    
    echo -e "${GREEN}✓${NC} Updated $file"
}

# Function to update version in environment files
update_environment_file() {
    local file=$1
    local version=$2
    local full_path="$SCRIPT_DIR/$file"
    
    if [ ! -f "$full_path" ]; then
        echo -e "${RED}Error: File not found: $file${NC}"
        return 2
    fi
    
    # Use sed to update the version field in TypeScript files
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/version: '[0-9]*\.[0-9]*\.[0-9]*'/version: '$version'/" "$full_path"
    else
        # Linux
        sed -i "s/version: '[0-9]*\.[0-9]*\.[0-9]*'/version: '$version'/" "$full_path"
    fi
    
    echo -e "${GREEN}✓${NC} Updated $file"
}

# Main script logic
main() {
    local new_version=$1
    
    # If version not provided as parameter, prompt user
    if [ -z "$new_version" ]; then
        echo -e "${YELLOW}No version specified.${NC}"
        read -p "Enter the new version (e.g., 2.1.0): " new_version
        
        # Check if user cancelled (empty input)
        if [ -z "$new_version" ]; then
            echo -e "${RED}Error: No version provided. Aborting.${NC}"
            exit 1
        fi
    fi
    
    # Validate version format
    if ! validate_version "$new_version"; then
        exit 1
    fi
    
    echo ""
    echo "================================================"
    echo "Bumping version to: $new_version"
    echo "================================================"
    echo ""
    
    # Update all package.json files
    echo "Updating package.json files..."
    for file in "${PACKAGE_FILES[@]}"; do
        update_package_json "$file" "$new_version"
    done
    
    echo ""
    
    # Update environment files
    echo "Updating environment files..."
    for file in "${ENV_FILES[@]}"; do
        update_environment_file "$file" "$new_version"
    done
    
    echo ""
    echo "================================================"
    echo -e "${GREEN}✓ Version successfully bumped to $new_version${NC}"
    echo "================================================"
    echo ""
    echo "Updated files:"
    for file in "${PACKAGE_FILES[@]}" "${ENV_FILES[@]}"; do
        echo "  - $file"
    done
    echo ""
    echo "Next steps:"
    echo "  1. Review the changes: git diff"
    echo "  2. Commit the changes: git add . && git commit -m \"Bump version to $new_version\""
    echo "  3. Tag the release: git tag v$new_version"
    echo ""
}

# Run main function with all arguments
main "$@"
