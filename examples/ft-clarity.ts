export const ftClarityExample = {
    'contracts/my-token.clar': `;; Simple Fungible Token (SIP-010-like)
;; Basic implementation of a fungible token

(define-fungible-token my-token)

(define-data-var token-uri (optional (string-utf8 256)) none)

;; Public functions
(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    (asserts! (is-eq tx-sender sender) (err u403))
    (ft-transfer? my-token amount sender recipient)))

(define-read-only (get-name)
  (ok "My Token"))

(define-read-only (get-symbol)
  (ok "MTK"))

(define-read-only (get-decimals)
  (ok u6))

(define-read-only (get-balance (who principal))
  (ok (ft-get-balance my-token who)))

(define-read-only (get-total-supply)
  (ok (ft-get-supply my-token)))

(define-read-only (get-token-uri)
  (ok (var-get token-uri)))

;; Minting (owner only or simplified)
(define-public (mint (amount uint) (recipient principal))
  (ft-mint? my-token amount recipient))
`,
    'Clarinet.toml': `[project]
name = "my-token"
authors = []
description = "A simple fungible token on Stacks"
telemetry = false
requirements = []
[contracts.my-token]
path = "contracts/my-token.clar"
clarity_version = 2`
};
