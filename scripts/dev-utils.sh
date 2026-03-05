#!/bin/bash

# Tailtown Development Utilities
# Helper scripts for common development tasks

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

#############################################
# Helper Functions
#############################################

print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

#############################################
# Code Generators
#############################################

generate_component() {
    local name=$1
    
    if [ -z "$name" ]; then
        echo -e "${RED}✗ Component name required${NC}"
        echo "Usage: $0 generate:component <ComponentName>"
        exit 1
    fi
    
    print_header "Generating React Component: $name"
    
    local component_dir="$PROJECT_ROOT/apps/frontend/src/components/$name"
    mkdir -p "$component_dir"
    
    # Create component file
    cat > "$component_dir/$name.tsx" << EOF
import React from 'react';
import { Box } from '@mui/material';

interface ${name}Props {
  // Add your props here
}

export const $name: React.FC<${name}Props> = (props) => {
  return (
    <Box>
      <h2>$name Component</h2>
      {/* Add your component content here */}
    </Box>
  );
};

export default $name;
EOF
    
    # Create test file
    cat > "$component_dir/$name.test.tsx" << EOF
import { render, screen } from '@testing-library/react';
import $name from './$name';

describe('$name', () => {
  it('renders without crashing', () => {
    render(<$name />);
    expect(screen.getByText('$name Component')).toBeInTheDocument();
  });
});
EOF
    
    # Create index file
    cat > "$component_dir/index.ts" << EOF
export { default as $name } from './$name';
export type { ${name}Props } from './$name';
EOF
    
    echo -e "${GREEN}✅ Component created successfully${NC}"
    echo ""
    echo "Files created:"
    echo "  - $component_dir/$name.tsx"
    echo "  - $component_dir/$name.test.tsx"
    echo "  - $component_dir/index.ts"
    echo ""
}

generate_service() {
    local name=$1
    
    if [ -z "$name" ]; then
        echo -e "${RED}✗ Service name required${NC}"
        echo "Usage: $0 generate:service <serviceName>"
        exit 1
    fi
    
    print_header "Generating Frontend Service: $name"
    
    local service_file="$PROJECT_ROOT/apps/frontend/src/services/${name}Service.ts"
    
    cat > "$service_file" << EOF
import { customerApi } from './api';

// Types
export interface ${name^} {
  id: string;
  // Add your fields here
}

// Service functions
export const ${name}Service = {
  getAll: async (): Promise<${name^}[]> => {
    const response = await customerApi.get('/api/${name}s');
    return response.data;
  },

  getById: async (id: string): Promise<${name^}> => {
    const response = await customerApi.get(\`/api/${name}s/\${id}\`);
    return response.data;
  },

  create: async (data: Partial<${name^}>): Promise<${name^}> => {
    const response = await customerApi.post('/api/${name}s', data);
    return response.data;
  },

  update: async (id: string, data: Partial<${name^}>): Promise<${name^}> => {
    const response = await customerApi.put(\`/api/${name}s/\${id}\`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await customerApi.delete(\`/api/${name}s/\${id}\`);
  },
};

export default ${name}Service;
EOF
    
    echo -e "${GREEN}✅ Service created successfully${NC}"
    echo ""
    echo "File created: $service_file"
    echo ""
}

generate_controller() {
    local name=$1
    local service=$2
    
    if [ -z "$name" ] || [ -z "$service" ]; then
        echo -e "${RED}✗ Name and service required${NC}"
        echo "Usage: $0 generate:controller <name> <customer|reservation>"
        exit 1
    fi
    
    print_header "Generating Backend Controller: $name"
    
    local controller_dir="$PROJECT_ROOT/services/$service/src/controllers"
    local controller_file="$controller_dir/${name}.controller.ts"
    
    mkdir -p "$controller_dir"
    
    cat > "$controller_file" << EOF
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all ${name}s
export const getAll${name^}s = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const ${name}s = await prisma.${name}.findMany();
    res.json(${name}s);
  } catch (error) {
    next(error);
  }
};

// Get ${name} by ID
export const get${name^}ById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const ${name} = await prisma.${name}.findUnique({
      where: { id },
    });
    
    if (!${name}) {
      return res.status(404).json({ error: '${name^} not found' });
    }
    
    res.json(${name});
  } catch (error) {
    next(error);
  }
};

// Create ${name}
export const create${name^} = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const ${name} = await prisma.${name}.create({
      data: req.body,
    });
    res.status(201).json(${name});
  } catch (error) {
    next(error);
  }
};

// Update ${name}
export const update${name^} = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const ${name} = await prisma.${name}.update({
      where: { id },
      data: req.body,
    });
    res.json(${name});
  } catch (error) {
    next(error);
  }
};

// Delete ${name}
export const delete${name^} = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    await prisma.${name}.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
EOF
    
    echo -e "${GREEN}✅ Controller created successfully${NC}"
    echo ""
    echo "File created: $controller_file"
    echo ""
    echo "Next steps:"
    echo "1. Create routes file"
    echo "2. Add to main router"
    echo "3. Add Prisma model if needed"
    echo ""
}

#############################################
# Data Utilities
#############################################

seed_sample_data() {
    print_header "Seeding Sample Data"
    
    echo "Select data to seed:"
    echo "  1) Customers (10 sample customers)"
    echo "  2) Pets (20 sample pets)"
    echo "  3) Reservations (30 sample reservations)"
    echo "  4) All of the above"
    read -p "Select (1-4): " choice
    
    case $choice in
        1)
            echo "Seeding customers..."
            node "$PROJECT_ROOT/scripts/seed-customers.js"
            ;;
        2)
            echo "Seeding pets..."
            node "$PROJECT_ROOT/scripts/seed-pets.js"
            ;;
        3)
            echo "Seeding reservations..."
            node "$PROJECT_ROOT/scripts/seed-reservations.js"
            ;;
        4)
            echo "Seeding all data..."
            node "$PROJECT_ROOT/scripts/seed-customers.js"
            node "$PROJECT_ROOT/scripts/seed-pets.js"
            node "$PROJECT_ROOT/scripts/seed-reservations.js"
            ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            exit 1
            ;;
    esac
    
    echo -e "${GREEN}✅ Seeding complete${NC}"
}

#############################################
# Log Analysis
#############################################

analyze_logs() {
    print_header "Log Analysis"
    
    local logs_dir="$PROJECT_ROOT/.logs"
    
    if [ ! -d "$logs_dir" ]; then
        echo -e "${YELLOW}No logs directory found${NC}"
        return 0
    fi
    
    echo -e "${CYAN}Recent Errors:${NC}"
    grep -i "error" "$logs_dir"/*.log 2>/dev/null | tail -20 || echo "No errors found"
    echo ""
    
    echo -e "${CYAN}Recent Warnings:${NC}"
    grep -i "warn" "$logs_dir"/*.log 2>/dev/null | tail -20 || echo "No warnings found"
    echo ""
    
    echo -e "${CYAN}Log File Sizes:${NC}"
    du -h "$logs_dir"/*.log 2>/dev/null || echo "No log files"
    echo ""
}

clean_logs() {
    print_header "Cleaning Logs"
    
    local logs_dir="$PROJECT_ROOT/.logs"
    
    if [ ! -d "$logs_dir" ]; then
        echo -e "${YELLOW}No logs directory found${NC}"
        return 0
    fi
    
    echo "This will delete all log files"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        rm -f "$logs_dir"/*.log
        echo -e "${GREEN}✅ Logs cleaned${NC}"
    else
        echo "Cancelled"
    fi
}

#############################################
# Quick Fixes
#############################################

fix_node_modules() {
    print_header "Fixing Node Modules"
    
    echo "This will:"
    echo "  1. Remove all node_modules directories"
    echo "  2. Remove all package-lock.json files"
    echo "  3. Reinstall all dependencies"
    echo ""
    read -p "Continue? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo "Cancelled"
        return 0
    fi
    
    echo "Removing node_modules..."
    find "$PROJECT_ROOT" -name "node_modules" -type d -prune -exec rm -rf {} +
    
    echo "Removing package-lock.json..."
    find "$PROJECT_ROOT" -name "package-lock.json" -type f -delete
    
    echo "Reinstalling dependencies..."
    cd "$PROJECT_ROOT" && pnpm install
    cd "$PROJECT_ROOT/apps/frontend" && pnpm install
    cd "$PROJECT_ROOT/apps/customer-service" && pnpm install
    cd "$PROJECT_ROOT/apps/reservation-service" && pnpm install
    cd "$PROJECT_ROOT/apps/reservation-service/scripts" && pnpm install
    cd "$PROJECT_ROOT/apps/payment-service" && pnpm install
    
    echo -e "${GREEN}✅ node_modules fixed${NC}"
}

fix_prisma() {
    print_header "Fixing Prisma"
    
    echo "Regenerating Prisma clients..."
    
    cd "$PROJECT_ROOT/apps/customer-service"
    pnpm exec prisma generate
    
    cd "$PROJECT_ROOT/apps/reservation-service"
    pnpm exec prisma generate
    
    echo -e "${GREEN}✅ Prisma clients regenerated${NC}"
    echo ""
    echo "Restart services to pick up changes:"
    echo "  pnpm run dev:restart"
}

#############################################
# Project Info
#############################################

show_project_info() {
    print_header "Project Information"
    
    echo -e "${CYAN}Repository:${NC}"
    git remote -v | head -2
    echo ""
    
    echo -e "${CYAN}Current Branch:${NC}"
    git branch --show-current
    echo ""
    
    echo -e "${CYAN}Recent Commits:${NC}"
    git log --oneline -5
    echo ""
    
    echo -e "${CYAN}Project Structure:${NC}"
    tree -L 2 -I 'node_modules|dist|build|coverage' "$PROJECT_ROOT" 2>/dev/null || \
    find "$PROJECT_ROOT" -maxdepth 2 -type d -not -path "*/node_modules*" -not -path "*/.git*"
    echo ""
    
    echo -e "${CYAN}Lines of Code:${NC}"
    find "$PROJECT_ROOT" -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | \
    grep -v node_modules | xargs wc -l | tail -1
    echo ""
}

#############################################
# Main
#############################################

case "${1:-}" in
    generate:component)
        generate_component "$2"
        ;;
    generate:service)
        generate_service "$2"
        ;;
    generate:controller)
        generate_controller "$2" "$3"
        ;;
    seed)
        seed_sample_data
        ;;
    logs:analyze)
        analyze_logs
        ;;
    logs:clean)
        clean_logs
        ;;
    fix:node-modules)
        fix_node_modules
        ;;
    fix:prisma)
        fix_prisma
        ;;
    info)
        show_project_info
        ;;
    *)
        echo "Tailtown Development Utilities"
        echo ""
        echo "Usage: $0 {command} [options]"
        echo ""
        echo "Code Generators:"
        echo "  generate:component <name>      - Generate React component"
        echo "  generate:service <name>         - Generate apps/frontend service"
        echo "  generate:controller <name> <service> - Generate backend controller"
        echo ""
        echo "Data Utilities:"
        echo "  seed                            - Seed sample data"
        echo ""
        echo "Log Analysis:"
        echo "  logs:analyze                    - Analyze recent logs"
        echo "  logs:clean                      - Clean all log files"
        echo ""
        echo "Quick Fixes:"
        echo "  fix:node-modules                - Reinstall all dependencies"
        echo "  fix:prisma                      - Regenerate Prisma clients"
        echo ""
        echo "Project Info:"
        echo "  info                            - Show project information"
        echo ""
        echo "npm shortcuts:"
        echo "  pnpm run util:component <name>"
        echo "  pnpm run util:service <name>"
        echo "  pnpm run util:logs"
        echo "  pnpm run util:fix-prisma"
        echo ""
        exit 1
        ;;
esac
