#!/bin/bash

# A more reliable script to fix imports for the reservation service

echo "Fixing imports in all controller files..."

# Update imports in nested controller files (src/controllers/reservation/*)
find ./src/controllers/reservation -name "*.ts" -type f -exec sed -i '' "s|from '[.]\{1,3\}/utils/api';|from '../../utils/api';|g" {} \;
find ./src/controllers/reservation -name "*.ts" -type f -exec sed -i '' "s|from '@tailtown/api';|from '../../utils/api';|g" {} \;

# Update imports in direct controller files (src/controllers/*.ts)
find ./src/controllers -maxdepth 1 -name "*.ts" -type f -exec sed -i '' "s|from '[.]\{1,3\}/utils/api';|from '../utils/api';|g" {} \;
find ./src/controllers -maxdepth 1 -name "*.ts" -type f -exec sed -i '' "s|from '@tailtown/api';|from '../utils/api';|g" {} \;

# Update imports in route files (src/routes/*.ts)
find ./src/routes -name "*.ts" -type f -exec sed -i '' "s|from '[.]\{1,3\}/utils/api';|from '../utils/api';|g" {} \;
find ./src/routes -name "*.ts" -type f -exec sed -i '' "s|from '@tailtown/api';|from '../utils/api';|g" {} \;

# Update imports in validation files (src/validation/*.ts)
find ./src/validation -name "*.ts" -type f -exec sed -i '' "s|from '[.]\{1,3\}/utils/api';|from '../utils/api';|g" {} \;
find ./src/validation -name "*.ts" -type f -exec sed -i '' "s|from '@tailtown/api';|from '../utils/api';|g" {} \;

# Update imports in the main index.ts file
sed -i '' "s|from '[.]\{1,3\}/utils/service';|from './utils/service';|g" ./src/index.ts
sed -i '' "s|from '@tailtown/api';|from './utils/service';|g" ./src/index.ts

echo "Import fixes complete!"
