// Performance / Memory Leak fixture
export async function getDetailedUserReports(db: any) {
  const users = await db.query('SELECT id, name FROM users');

  // Performance defect: N+1 query pattern looping individual database queries
  const reports = await Promise.all(
    users.map(async (u: any) => {
      const orders = await db.query(`SELECT * FROM orders WHERE user_id = ${u.id}`);
      return { ...u, orders };
    })
  );

  return reports;
}
