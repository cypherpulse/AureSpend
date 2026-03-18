(use-trait ft-trait 'STGDS0Y17973EN5TCHNHGJJ9B31XWQ5YXBQ0KQ2Y.usdcx-traits.sip010-ft-trait)

;; Errors

(define-constant ERR_UNAUTHORIZED (err u100))
(define-constant ERR_PAUSED (err u101))
(define-constant ERR_INVALID_AMOUNT (err u102))
(define-constant ERR_TOKEN_NOT_SET (err u103))
(define-constant ERR_ALREADY_PROCESSED (err u104))
(define-constant ERR_MUST_BE_PAUSED (err u105))
(define-constant ERR_INVALID_ROLE (err u106))
(define-constant ERR_NO_PENDING_OWNER (err u107))
(define-constant ERR_VAULT_PRINCIPAL_NOT_SET (err u108))

(define-constant ROLE_VERIFIER u1)
(define-constant ROLE_PAUSER u2)
(define-constant ROLE_EMERGENCY_OPERATOR u3)

;; State

(define-data-var owner principal tx-sender)
(define-data-var pending-owner (optional principal) none)
(define-data-var paused bool false)
(define-data-var token-contract (optional principal) none)
(define-data-var vault-principal (optional principal) none)

;; role-based access control configured by deployer/owner
(define-map roles { who: principal, role: uint } bool)

;; processed payout ids to prevent replay/double-send
(define-map processed-payouts (buff 32) bool)

;; Internal helpers

(define-private (is-owner)
	(is-eq tx-sender (var-get owner))
)

(define-private (is-verifier (who principal))
	(default-to false (map-get? roles { who: who, role: ROLE_VERIFIER }))
)

(define-private (is-pauser (who principal))
	(default-to false (map-get? roles { who: who, role: ROLE_PAUSER }))
)

(define-private (is-emergency-operator (who principal))
	(default-to false (map-get? roles { who: who, role: ROLE_EMERGENCY_OPERATOR }))
)

(define-private (can-pause)
	(or (is-owner) (is-pauser tx-sender))
)

(define-private (can-emergency-withdraw)
	(or (is-owner) (is-emergency-operator tx-sender))
)

(define-private (is-valid-role (role uint))
	(or
		(is-eq role ROLE_VERIFIER)
		(is-eq role ROLE_PAUSER)
		(is-eq role ROLE_EMERGENCY_OPERATOR)
	)
)

(define-private (assert-not-paused)
	(asserts! (not (var-get paused)) ERR_PAUSED)
)

(define-private (assert-positive (amount uint))
	(asserts! (> amount u0) ERR_INVALID_AMOUNT)
)

(define-private (get-token-contract)
	(match (var-get token-contract)
		token token
		ERR_TOKEN_NOT_SET
	)
)

(define-private (get-vault-principal)
	(match (var-get vault-principal)
		p p
		ERR_VAULT_PRINCIPAL_NOT_SET
	)
)

;; Admin

(define-public (propose-owner (new-owner principal))
	(begin
		(asserts! (is-owner) ERR_UNAUTHORIZED)
		(var-set pending-owner (some new-owner))
		(ok true)
	)
)

(define-public (accept-owner)
	(match (var-get pending-owner)
		pending
		(begin
			(asserts! (is-eq tx-sender pending) ERR_UNAUTHORIZED)
			(var-set owner pending)
			(var-set pending-owner none)
			(ok true)
		)
		ERR_NO_PENDING_OWNER
	)
)

(define-public (cancel-owner-transfer)
	(begin
		(asserts! (is-owner) ERR_UNAUTHORIZED)
		(var-set pending-owner none)
		(ok true)
	)
)

(define-public (set-paused (value bool))
	(begin
		(asserts! (can-pause) ERR_UNAUTHORIZED)
		(var-set paused value)
		(ok true)
	)
)

(define-public (set-token-contract (token principal))
	(begin
		(asserts! (is-owner) ERR_UNAUTHORIZED)
		(asserts! (or (var-get paused) (is-none (var-get token-contract))) ERR_MUST_BE_PAUSED)
		(var-set token-contract (some token))
		(ok true)
	)
)

(define-public (set-vault-principal (vault principal))
	(begin
		(asserts! (is-owner) ERR_UNAUTHORIZED)
		(asserts! (or (var-get paused) (is-none (var-get vault-principal))) ERR_MUST_BE_PAUSED)
		(var-set vault-principal (some vault))
		(ok true)
	)
)

(define-public (set-role (who principal) (role uint) (allowed bool))
	(begin
		(asserts! (is-owner) ERR_UNAUTHORIZED)
		(asserts! (is-valid-role role) ERR_INVALID_ROLE)
		(map-set roles { who: who, role: role } allowed)
		(ok true)
	)
)

(define-public (set-verifier (who principal) (allowed bool))
	(begin
		(asserts! (is-owner) ERR_UNAUTHORIZED)
		(map-set roles { who: who, role: ROLE_VERIFIER } allowed)
		(ok true)
	)
)

;; Core vault flows

;; Deposit USDCx into this vault from tx-sender.
(define-public (deposit (amount uint) (memo (optional (buff 34))))
	(let (
		(token (try! (get-token-contract)))
		(vault (try! (get-vault-principal)))
	)
		(begin
			(try! (assert-not-paused))
			(try! (assert-positive amount))
			(contract-call? token transfer amount tx-sender vault memo)
		)
	)
)

;; Release funds to recipient once an off-chain verification has happened.
;; payout-id must be unique per disbursement to prevent replay.
(define-public (release-verified
	(payout-id (buff 32))
	(recipient principal)
	(amount uint)
	(memo (optional (buff 34)))
)
	(let (
		(token (try! (get-token-contract)))
		(vault (try! (get-vault-principal)))
	)
		(begin
			(try! (assert-not-paused))
			(asserts! (is-verifier tx-sender) ERR_UNAUTHORIZED)
			(try! (assert-positive amount))
			(asserts! (not (default-to false (map-get? processed-payouts payout-id))) ERR_ALREADY_PROCESSED)
			(map-set processed-payouts payout-id true)
			(try! (contract-call? token transfer amount vault recipient memo))
			(print {
				event: "release-verified",
				payout-id: payout-id,
				recipient: recipient,
				amount: amount,
				verifier: tx-sender
			})
			(ok true)
		)
	)
)

;; Emergency recovery by owner while paused.
(define-public (emergency-withdraw (recipient principal) (amount uint) (memo (optional (buff 34))))
	(let (
		(token (try! (get-token-contract)))
		(vault (try! (get-vault-principal)))
	)
		(begin
			(asserts! (can-emergency-withdraw) ERR_UNAUTHORIZED)
			(asserts! (var-get paused) ERR_MUST_BE_PAUSED)
			(try! (assert-positive amount))
			(try! (contract-call? token transfer amount vault recipient memo))
		)
	)
)

;; Read-only views

(define-read-only (get-owner)
	(ok (var-get owner))
)

(define-read-only (get-pending-owner)
	(ok (var-get pending-owner))
)

(define-read-only (get-paused)
	(ok (var-get paused))
)

(define-read-only (get-token)
	(ok (var-get token-contract))
)

(define-read-only (get-vault-principal)
	(ok (var-get vault-principal))
)

(define-read-only (get-verifier-status (who principal))
	(ok (default-to false (map-get? roles { who: who, role: ROLE_VERIFIER })))
)

(define-read-only (get-role-status (who principal) (role uint))
	(ok (default-to false (map-get? roles { who: who, role: role })))
)

(define-read-only (is-payout-processed (payout-id (buff 32)))
	(ok (default-to false (map-get? processed-payouts payout-id)))
)

(define-public (vault-balance)
	(match (var-get token-contract)
		token
		(match (var-get vault-principal)
			vault (contract-call? token get-balance vault)
			ERR_VAULT_PRINCIPAL_NOT_SET
		)
		ERR_TOKEN_NOT_SET
	)
)
