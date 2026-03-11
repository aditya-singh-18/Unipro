import bcrypt from 'bcryptjs';

const password = '2303051050000'; // enrollment id = default password

const generateHash = async () => {
  const hash = await bcrypt.hash(password, 10);
  console.log('Password:', password);
  console.log('Hashed Password:', hash);
};

generateHash();
{/*



UPDATE users
SET password_hash = '$2b$10$ZEAw19dVTV1MJp.XL9spYOTY3.95KsnVQninSpViKiCQI6UpnwH9.'
WHERE email = ' admin@parul.edu';

{
  "identifier": "ADMIN001",
  "password": "ADMIN001",
  "role": "ADMIN"
}






  */}
