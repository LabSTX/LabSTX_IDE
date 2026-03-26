# Contributing to LabSTX IDE

Thank you for your interest in contributing to LabSTX! We welcome all contributions that help make Clarity development faster and easier for everyone.

## 🚀 Getting Started

To contribute to the LabSTX IDE, you'll need a local development environment.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Git](https://git-scm.com/)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/LabSTX/LabSTX_IDE.git
    cd LabSTX_IDE
    ```

2.  **Set up the IDE:**
    ```bash
    cd IDE
    npm install
    ```

### Running Locally

To run the full LabSTX experience, you should have both the IDE and the API running.

1.  **Start the IDE:**
    ```bash
    cd IDE
    npm run dev
    ```

The IDE will be available at [http://localhost:3000](http://localhost:3000).

---

## 🛠 Project Structure

- `IDE/src/`: Core logic and UI components.
- `IDE/src/components/`: Reusable React components.
- `IDE/src/services/`: API integration and logic (Git, AI, Formatting).

---

## 🎨 Style Guidelines

- **TypeScript**: All new code should be written in TypeScript with proper type definitions.
- **React**: Functional components and hooks are preferred.
- **Styling**: We use Tailwind CSS for styling. Please adhere to the existing Neo-Brutalist design language.
- **Formatting**: We use Prettier for code formatting.

---

## 📬 Pull Request Process

1.  **Create a Branch**: Create a new branch for your feature or bug fix.
    ```bash
    git checkout -b feature/your-feature-name
    ```
2.  **Make Changes**: Implement your changes and ensure the code is clean.
3.  **Test**: Run the application and verify your changes work as expected.
4.  **Commit**: Write clear, descriptive commit messages.
5.  **Submit PR**: Open a pull request against the `main` branch with a clear description of your changes.

---

## 🐛 Reporting Issues

If you find a bug or have a feature suggestion, please open an issue on GitHub with:

- A descriptive title.
- Steps to reproduce the bug.
- Expected vs. actual behavior.
- Screenshots if applicable.

---

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.
