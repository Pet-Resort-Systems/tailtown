# Development Guide

## Development Workflow

### 1. Setting Up the Development Environment

```bash
# Clone the repository
git clone https://github.com/moosecreates/tailtown.git
cd tailtown

# Install dependencies
pnpm install

# Set up environment variables
cp apps/frontend/.env.example apps/frontend/.env
cp apps/customer-service/.env.example apps/customer-service/.env
```

### 2. Starting the Development Servers

```bash
# Terminal 1: Backend
cd apps/customer-service
source ~/.nvm/nvm.sh
pnpm run dev

# Terminal 2: Frontend
cd apps/frontend
source ~/.nvm/nvm.sh
pnpm start
```

### 3. Development Process

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Write Code**
   - Follow TypeScript best practices
   - Add JSDoc comments
   - Keep files under 300 lines
   - Write unit tests

3. **Test Your Changes**
   - Run unit tests
   - Test in development environment
   - Check for TypeScript errors
   - Verify API responses

4. **Submit Changes**
   - Commit with clear messages
   - Push to your branch
   - Create a pull request

## Code Organization

### Frontend Structure

```
apps/frontend/
├── src/
│   ├── components/     # Reusable UI components
│   │   ├── calendar/
│   │   ├── customers/
│   │   ├── pets/
│   │   └── shared/
│   ├── pages/         # Page components
│   │   ├── calendar/
│   │   ├── customers/
│   │   └── pets/
│   ├── services/      # API services
│   ├── types/         # TypeScript interfaces
│   └── contexts/      # React contexts
```

### Backend Structure

```
apps/customer-service/
├── src/
│   ├── controllers/   # Route handlers
│   ├── routes/        # API routes
│   ├── middleware/    # Express middleware
│   └── prisma/        # Database schema
```

## Coding Standards

### TypeScript Guidelines

1. **Use Proper Types**
   ```typescript
   // Bad
   const user: any = { name: 'John' };

   // Good
   interface User {
     name: string;
     age?: number;
   }
   const user: User = { name: 'John' };
   ```

2. **Async/Await Pattern**
   ```typescript
   // Bad
   somePromise.then(data => {
     // handle data
   }).catch(error => {
     // handle error
   });

   // Good
   try {
     const data = await somePromise;
     // handle data
   } catch (error) {
     // handle error
   }
   ```

### React Guidelines

1. **Functional Components**
   ```typescript
   // Good
   const MyComponent: React.FC<Props> = ({ prop1, prop2 }) => {
     return (
       <div>
         {/* JSX */}
       </div>
     );
   };
   ```

2. **Custom Hooks**
   ```typescript
   // Good
   const useCustomHook = () => {
     const [state, setState] = useState<string>('');
     
     useEffect(() => {
       // effect logic
     }, []);
     
     return { state };
   };
   ```

### API Guidelines

1. **Response Format**
   ```typescript
   interface ApiResponse<T> {
     status: 'success' | 'error';
     data: T;
     results?: number;
     totalPages?: number;
     currentPage?: number;
   }
   ```

2. **Error Handling**
   ```typescript
   try {
     // operation
   } catch (error) {
     next(new AppError('Error message', 400));
   }
   ```

## Testing

### Unit Tests

```typescript
describe('Component', () => {
  it('should render correctly', () => {
    const { getByText } = render(<Component />);
    expect(getByText('Title')).toBeInTheDocument();
  });
});
```

### API Tests

```typescript
describe('API Endpoint', () => {
  it('should return correct data', async () => {
    const response = await request(app)
      .get('/api/endpoint')
      .expect(200);
    
    expect(response.body).toHaveProperty('status', 'success');
  });
});
```

## Debugging

### Frontend Debugging

1. Use React Developer Tools
2. Console logging with proper levels
3. Source maps in development

### Backend Debugging

1. Use VS Code debugger
2. Winston logger
3. Postman for API testing
