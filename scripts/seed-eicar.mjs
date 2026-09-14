import { createHash } from 'node:crypto';

const eicar = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
console.log(createHash('sha256').update(eicar, 'ascii').digest('hex'));
