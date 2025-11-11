# Contributing to ioBroker.switchbot

First off, thank you for considering contributing to ioBroker.switchbot! It's people like you that make this adapter better for everyone.

## Code of Conduct

This project and everyone participating in it is governed by respect and professionalism. By participating, you are expected to uphold this standard.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* Use a clear and descriptive title
* Describe the exact steps which reproduce the problem
* Provide specific examples to demonstrate the steps
* Describe the behavior you observed and what you expected to see
* Include screenshots if possible
* Include your environment details (adapter version, node version, OS)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

* Use a clear and descriptive title
* Provide a detailed description of the suggested enhancement
* Explain why this enhancement would be useful
* List any similar features in other adapters if applicable

### Adding New Device Support

To add support for a new SwitchBot device:

1. Check the SwitchBot API documentation for the device type and available commands
2. Add the device type mapping to `lib/device-manager.js`
3. Test with a real device if possible
4. Update the README.md with the new device
5. Add tests for the new device type

### Pull Requests

* Fill in the required template
* Follow the JavaScript style guide (ESLint configuration)
* Include tests for new functionality
* Update documentation as needed
* Ensure all tests pass
* Keep commits atomic and well-described

## Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/ioBroker.switchbot.git`
3. Install dependencies: `npm install`
4. Make your changes
5. Run tests: `npm test`
6. Run linter: `npm run lint`
7. Commit your changes using conventional commits format
8. Push to your fork and submit a pull request

## Commit Message Format

We use conventional commits. Please format your commit messages as:

```
type(scope): subject

body

footer
```

Types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Example:
```
feat(devices): add support for Robot Vacuum S1

- Add device type mapping for Robot Vacuum S1
- Implement cleaning commands
- Add battery and status monitoring

Closes #123
```

## Testing

Run tests before submitting a pull request:

```bash
npm test           # Run all tests
npm run lint       # Run linter
npm run test:unit  # Run unit tests only
```

## Questions?

Feel free to open an issue with your question or reach out to the maintainers.

Thank you for contributing! 🎉