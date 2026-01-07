# Task Completion Checklist

When completing a task, ensure the following:

## Code Quality
- [ ] Code follows TypeScript best practices
- [ ] No TypeScript errors (`npm run build` completes without errors)
- [ ] No ESLint warnings (`npm run lint` passes)
- [ ] Proper error handling implemented
- [ ] No console.log statements left in production code

## Testing
- [ ] Feature works as expected in dev environment
- [ ] Test on different screen sizes (mobile/desktop)
- [ ] Test theme switching (light/dark modes)
- [ ] Test with PWA features (if applicable)
- [ ] Test data persistence (IndexedDB operations)

## Security
- [ ] No sensitive data exposed
- [ ] Input validation on user inputs
- [ ] No XSS vulnerabilities
- [ ] PIN/security features working (if applicable)

## UI/UX
- [ ] Consistent styling with existing design
- [ ] Responsive design considerations
- [ ] Loading states handled
- [ ] Error states handled
- [ ] Empty states handled
- [ ] Smooth animations/transitions

## Database
- [ ] Proper indexes on database queries
- [ ] Balance synchronization working (for transactions)
- [ ] No orphaned data
- [ ] Proper cleanup on delete operations

## Documentation
- [ ] Code is self-documenting with clear naming
- [ ] Complex logic has comments
- [ ] README updated if feature is user-facing

## Before Committing
```bash
# Run linter
npm run lint

# Build to check for TypeScript errors
npm run build

# Preview build to verify
npm run preview
```

## Common Gotchas
- Remember to update account balances when adding/deleting transactions
- Don't delete default categories or accounts
- Use `generateId()` for new entities, not hardcoded IDs
- Dates must be in YYYY-MM-DD format
- Icons must be registered in `iconMap` before use
