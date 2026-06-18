import fs from 'fs';
import dotenv from 'dotenv';

const envPath = fs.existsSync('.env')
    ? '.env'
    : (fs.existsSync('env') ? 'env' : '.env');

dotenv.config({ path: envPath });
