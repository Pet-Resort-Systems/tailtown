#!/bin/bash

# Script to replace @tailtown/api imports with local utility imports
# This fixes the dependency issue and makes the service work independently

echo "Fixing imports in reservation service controllers..."

# Find all TypeScript files
FILES=$(find ./src -type f -name "*.ts")

# Loop through each file and replace imports
for file in $FILES; do
  # Replace imports from @tailtown/api with local utils/api
  sed -i '' "s|from '@tailtown/api';|from '../../../utils/api';|g" $file
  sed -i '' "s|from '@tailtown/api';|from '../../utils/api';|g" $file
  sed -i '' "s|from '@tailtown/api';|from '../utils/api';|g" $file
  
  echo "Fixed imports in $file"
done

echo "Import fix complete!"
