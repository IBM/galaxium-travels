# Contributing to Galaxium Travels

Thank you for your interest in contributing to Galaxium Travels! This document provides guidelines and instructions for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Developer Certificate of Origin (DCO)](#developer-certificate-of-origin-dco)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Submitting Changes](#submitting-changes)
- [Review Process](#review-process)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful and professional in all interactions.

## Developer Certificate of Origin (DCO)

This project uses the Developer Certificate of Origin (DCO) to ensure that contributors have the legal right to submit their contributions. By contributing to this project, you certify that:

1. The contribution was created in whole or in part by you and you have the right to submit it under the open source license indicated in the file; or
2. The contribution is based upon previous work that, to the best of your knowledge, is covered under an appropriate open source license and you have the right under that license to submit that work with modifications, whether created in whole or in part by you, under the same open source license (unless you are permitted to submit under a different license); or
3. The contribution was provided directly to you by some other person who certified (1), (2) or (3) and you have not modified it.

For the full text of the DCO, see [developercertificate.org](https://developercertificate.org/).

### How to Sign Off Your Commits

Every commit must include a `Signed-off-by` line in the commit message. This certifies that you agree to the DCO.

#### Automatic Sign-Off (Recommended)

Use the `-s` or `--signoff` flag when committing:

```bash
git commit -s -m "Add new feature for flight search"
```

This automatically adds the sign-off line:
```
Signed-off-by: Your Name <your.email@example.com>
```

#### Configure Git to Always Sign Off

Set up a git alias to always include the sign-off:

```bash
git config --global alias.ci 'commit -s'
```

Then use `git ci` instead of `git commit`.

#### Fixing Missing Sign-Offs

If you forgot to sign off your commits, you can fix them:

**For the last commit:**
```bash
git commit --amend --signoff
git push --force-with-lease
```

**For multiple commits:**
```bash
# Sign off the last N commits
git rebase HEAD~N --signoff
git push --force-with-lease
```

**For all commits in a branch:**
```bash
# Assuming you branched from main
git rebase main --signoff
git push --force-with-lease
```

### DCO Check Automation

All pull requests are automatically checked for DCO compliance via GitHub Actions. If the check fails:

1. You'll see a comment on your PR with instructions
2. Fix the missing sign-offs using the commands above
3. Force push your changes
4. The DCO check will run again automatically

## Getting Started

### Prerequisites

- **Python 3.8+** - [Download](https://www.python.org/downloads/)
- **Node.js 18+** - [Download](https://nodejs.org/)
- **Java 17 or 21** (for hold service) - [Download](https://adoptium.net/)
- **Maven** (for hold service) - [Download](https://maven.apache.org/)
- **Git** - [Download](https://git-scm.com/)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/galaxium-travels-2026-ibm.git
   cd galaxium-travels-2026-ibm
   ```
3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/galaxium-travels-2026-ibm.git
   ```

### Local Setup

Run the quick start script:
```bash
./start.sh
```

Or set up each component manually:

**Backend:**
```bash
cd booking_system_backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
python server.py
```

**Frontend:**
```bash
cd booking_system_frontend
npm install
npm run dev
```

**Java Hold Service:**
```bash
cd booking_system_inventory_hold_service
mvn spring-boot:run
```

## Development Workflow

### Creating a Branch

Create a feature branch from `main`:

```bash
git checkout main
git pull upstream main
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions or fixes

### Making Changes

1. Make your changes in your feature branch
2. Follow the [coding standards](#coding-standards)
3. Add or update tests as needed
4. Ensure all tests pass
5. Commit with sign-off:
   ```bash
   git add .
   git commit -s -m "Add feature: description of your changes"
   ```

### Keeping Your Branch Updated

Regularly sync with upstream:

```bash
git fetch upstream
git rebase upstream/main
```

## Coding Standards

### Python (Backend)

- Follow [PEP 8](https://pep8.org/) style guide
- Use type hints for function parameters and return values
- Use snake_case for functions and variables
- Use PascalCase for classes
- Maximum line length: 100 characters
- Use docstrings for all public functions and classes

Example:
```python
def calculate_total_price(base_price: float, seat_class: str) -> float:
    """Calculate the total price based on seat class multiplier.
    
    Args:
        base_price: The base flight price
        seat_class: The seat class (economy, business, galaxium)
        
    Returns:
        The calculated total price
    """
    multipliers = {"economy": 1.0, "business": 2.5, "galaxium": 5.0}
    return base_price * multipliers.get(seat_class, 1.0)
```

### TypeScript (Frontend)

- Follow the existing ESLint configuration
- Use TypeScript strict mode
- Use camelCase for variables and functions
- Use PascalCase for components and types
- Prefer functional components with hooks
- Use proper TypeScript types (avoid `any`)

Example:
```typescript
interface Flight {
  id: number;
  origin: string;
  destination: string;
  price: number;
}

const FlightCard: React.FC<{ flight: Flight }> = ({ flight }) => {
  return (
    <div className="flight-card">
      <h3>{flight.origin} → {flight.destination}</h3>
      <p>${flight.price.toLocaleString()}</p>
    </div>
  );
};
```

### Java (Hold Service)

- Follow standard Java conventions
- Use Lombok annotations appropriately
- Use camelCase for methods and variables
- Use PascalCase for classes
- Add JavaDoc for public methods
- Use `@Transactional` for service methods that modify data

Example:
```java
@Service
@RequiredArgsConstructor
public class QuoteService {
    private final QuoteRepository quoteRepository;
    
    /**
     * Creates a new quote for a flight booking.
     *
     * @param request the quote creation request
     * @return the created quote
     */
    @Transactional
    public Quote createQuote(CreateQuoteRequest request) {
        // Implementation
    }
}
```

## Testing Requirements

### Backend Tests

All backend changes must include tests. Run tests before submitting:

```bash
cd booking_system_backend
pytest                          # Run all tests
pytest -v                       # Verbose output
pytest tests/test_services.py   # Specific test file
```

Test coverage requirements:
- Service layer functions: 100%
- REST endpoints: 100%
- Error handling: All error paths tested

### Frontend Tests

Ensure the build passes and linting is clean:

```bash
cd booking_system_frontend
npm run build                   # Production build
npm run lint                    # Linting check
```

### End-to-End Tests

For changes affecting multiple services, run E2E tests:

```bash
./test.sh
```

## Submitting Changes

### Before Submitting

1. ✅ All tests pass locally
2. ✅ Code follows style guidelines
3. ✅ All commits are signed off (DCO)
4. ✅ Branch is up to date with upstream main
5. ✅ Commit messages are clear and descriptive

### Creating a Pull Request

1. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. Go to the original repository on GitHub
3. Click "New Pull Request"
4. Select your fork and branch
5. Fill out the PR template:
   - **Title**: Clear, concise description
   - **Description**: What changes were made and why
   - **Related Issues**: Link any related issues
   - **Testing**: Describe how you tested the changes
   - **Screenshots**: Include for UI changes

### Pull Request Template

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Fixes #(issue number)

## Testing
Describe the tests you ran and how to reproduce them

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code where necessary
- [ ] I have updated the documentation accordingly
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix/feature works
- [ ] All new and existing tests pass locally
- [ ] All commits are signed off (DCO)
```

## Review Process

### What to Expect

1. **Automated Checks**: GitHub Actions will run:
   - DCO check (all commits must be signed off)
   - Linting and formatting checks
   - Test suite execution

2. **Code Review**: Maintainers will review your code for:
   - Code quality and style
   - Test coverage
   - Documentation
   - Adherence to project patterns (see [AGENTS.md](AGENTS.md))

3. **Feedback**: You may receive requests for changes
   - Address feedback in new commits (also signed off)
   - Push updates to your branch
   - Respond to review comments

4. **Approval**: Once approved, a maintainer will merge your PR

### Review Timeline

- Initial review: Within 3-5 business days
- Follow-up reviews: Within 2 business days
- Merge: After approval and passing all checks

## Additional Resources

- **[README.md](README.md)** - Project overview and quick start
- **[AGENTS.md](AGENTS.md)** - Critical patterns and footguns for AI agents
- **[Backend README](booking_system_backend/README.md)** - Backend API documentation
- **[Frontend README](booking_system_frontend/README.md)** - Frontend component guide
- **[Java Service README](booking_system_inventory_hold_service/README.md)** - Hold service documentation

## Questions?

If you have questions about contributing:

1. Check the documentation in the links above
2. Search existing issues and discussions
3. Open a new issue with the `question` label
4. Reach out to maintainers

## License

By contributing to this project, you agree that your contributions will be licensed under the same license as the project (see [LICENSE](LICENSE)).

---

Thank you for contributing to Galaxium Travels! 🚀✨