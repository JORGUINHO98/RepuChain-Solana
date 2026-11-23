CREATE TABLE wallet_identities (
 address VARCHAR(44) PRIMARY KEY,
 "userId" UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE wallet_challenges (
 id UUID PRIMARY KEY,
 address VARCHAR(44) NOT NULL,
 origin VARCHAR(255) NOT NULL,
 message TEXT NOT NULL,
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "usedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX wallet_challenges_expiry ON wallet_challenges("expiresAt");
