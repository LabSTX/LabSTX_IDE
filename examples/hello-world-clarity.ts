export const helloWorldClarityExample = {
  'contracts/hello-world.clar': `;; Hello World Contract
;; A simple contract that returns a greeting

(define-read-only (say-hi)
  (ok "Hello from Stacks!"))

(define-read-only (echo-number (val uint))
  (ok val))
`,
  'Clarinet.toml': `[project]
name = "hello-world"
authors = []
description = "A simple hello world on Stacks"
telemetry = false
requirements = []
[contracts.hello-world]
path = "contracts/hello-world.clar"
clarity_version = 3
epoch = 'latest'`
};
