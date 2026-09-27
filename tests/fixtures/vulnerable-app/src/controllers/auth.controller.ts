// Vulnerable Auth Controller for security fixture testing
const JWT_SECRET = 'SUPER_SECRET_HARDCODED_KEY_12345'; // CWE-798: Hardcoded Credential

export async function login(req: any, res: any, db: any) {
  const { email, password } = req.body;

  // CWE-89: SQL Injection via direct string concatenation
  const query = "SELECT * FROM users WHERE email = '" + email + "' AND password = '" + password + "'";
  const user = await db.query(query);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  return res.json({ token: 'jwt-token-placeholder', secretUsed: JWT_SECRET });
}
