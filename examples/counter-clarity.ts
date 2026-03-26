export const counterClarityExample = {
  'contracts/counter.clar': `;; Counter Contract
;; A stateful contract that manages a counter

(define-data-var counter uint u0)

(define-public (increment)
  (begin
    (var-set counter (+ (var-get counter) u1))
    (ok (var-get counter))))

(define-public (decrement)
  (begin
    (var-set counter (- (var-get counter) u1))
    (ok (var-get counter))))

(define-read-only (get-counter)
  (ok (var-get counter)))
`,
  'Clarinet.toml': `[project]
name = "counter"
authors = []
description = "A simple counter on Stacks"
telemetry = false
requirements = []
[contracts.counter]
path = "contracts/counter.clar"
clarity_version = 3
epoch = 'latest'`
};
