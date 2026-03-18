(define-trait sip010-ft-trait
	(
		;; transfer amount from sender to recipient, optional memo
		(transfer (uint principal principal (optional (buff 34))) (response bool uint))
		;; read token balance of an account
		(get-balance (principal) (response uint uint))
	)
)
