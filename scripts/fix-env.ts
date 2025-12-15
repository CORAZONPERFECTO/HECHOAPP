
import fs from 'fs';
import path from 'path';

const content = `NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCZKE9ZRLhNJGxf-PNdbR6IjgMCl5xvkbA
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=hecho-srl-free.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=hecho-srl-free
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=hecho-srl-free.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=216623683956
NEXT_PUBLIC_FIREBASE_APP_ID=1:216623683956:web:7b7de0220203978c6db421
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XHS77PK8HC
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://hecho-srl-free.firebaseio.com

GCP_PROJECT_ID=hecho-srl-free
GCP_CLIENT_EMAIL=firebase-adminsdk-fbsvc@hecho-srl-free.iam.gserviceaccount.com
GCP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCbraiR4I7f+VxZ\\nTrxBk6K\\/yDENtJSd8Vtwel8b+QjDwHiohIvcKqPtkCZic\\/PO8zOVxSxIRJQbguLI\\n1FfkSx0IL39TT212F\\/0DYhC5YRWnYuT+0jIjmFRhPZIcZuPWrR7UVwkiqdQHUxr3\\nsSqIASF7utV4StUppuMzDF1vZBEHUJjH0gmpwQk30OloWVJXbSXVjflmQbJ8hlJQ\\nSrjSG8YjXpKkERE3NbxXzBbJvqBqtj0QlsetI4o3GcJUdxkkcO7rJtj8EKNEXmIq\\nuaibdMyOw7qL5pAH2+2BPVSrKWl845pe5L\\/lWgjcfxQFECCCcqV6fQNXTuAb3bNR\\nZgHgThc7AgMBAAECggEAAPeAH3\\/Mg1mSGD\\/j7WhUT2qX22Tus1hnX\\/hylMLkKgsM\\n9Mb182UUZYpKorvjnLpn7Jsv3jcG0HDspaCj9xf8UyuwV70bies2OAoo3m3a65Iy\\np954Tz5H796pBKIi8hdbJKhxtxRk67K5bSZdhEC1i4Yqgze7wSl3Kb7+6Y0uieQU\\nw5GkmcDQmslZL\\/+B7AkBsYD02ENXvoVaMJZP7KSF81OypDpsrwBOiplnaTrzqfnZ\\no2AEgc0Ung7aNLZAzUjbiCzYUxRe3+N+Aopx036r5DoymYOT0veL23gzpLhDXDhA\\nHR2uEBmDtTFP66lH7XudhAdZhNBXbIjQzWKCnNyzCQKBgQDPf+HFui7Ll\\/LF8BNi\\ngN7oqE9p5x9b1wXnucYb9AJxSHt3\\/w7XPi\\/a91KQVQ\\/e1uZBFWe7oi6FJTQm8boE\\n8xf5yhHajK5bDOXDVxwnGKlcjPhTyilcNgtzfKQ4Ckhe95nF3zy1mijV\\/HFz+ei\\/\\nEG1CLAzgijPUjsxh5TAeXfShpQKBgQDAEPXR1sd64zMRo92TCOuAKG7GFLdntw1+\\nH\\/OfaXQpjHv4GLOoaFxXDr1zL+TqgeCUr0rL\\/+UIILJ+GNuTij\\/pyWo4+pVCZIcm\\nqxLljw\\/BNfHg9naK6DmhAWp+zPeibuO5OLXD\\/DR2\\/ZpyxdZ\\/yRwIU437s2eh9VRo\\nkcDlyny\\/XwKBgCRkQ06QVsCyR4vbjSrLe0zGqBbkyCUtUwXPGSWx5\\/PCSJVFEG9D\\notT+Z2aU5JGqkvt7K5RG323OlpT19DAGCoBupi70WWfynSFjV7arpphqyOq5HAPm\\nHqAEjjCd7Q9q0XdYracUAHF3MtaqT92inebrHt8Kngh7evD4ZzYMOGlZAoGBAJXO\\nZL3YBV1PSuzuYAuoQG+Emeo8DFWEDK0cZNwo12b04VjAg5jOVX+9ynzGlYln5fBy\\nzSdSn6R4RGBgKRvqEDHcXNK2eKcBW\\/0IIEQXEtXDqrap5gowWYrAXP0sB9aVIV+9\\n4OBNnepVohr1PnoLNac07KCu7R0BCmZJkShqiGSHAoGAKdvODy3\\/IsTgda9Ja6NA\\npTIP6lmnYisSWJz1cJLS+FCyBgmSEFxiiepogfx22in4juVr9r7AsXzMU0fDtEgM\\n3+1tPRR9zpIaGl03XUIslg9Fr1qXzIUGkygFJLpDhO\\/LQO+B\\/gUp1vgcMM8iNOEa\\nJ32y4ZWxqOp2UDNeJeis0kI=\\n-----END PRIVATE KEY-----\\n"
GCP_LOCATION=us-central1
`;

const filePath = path.join(process.cwd(), '.env.local');

try {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully wrote .env.local (' + content.length + ' bytes)');
    const readBack = fs.readFileSync(filePath, 'utf8');
    console.log('First line:', readBack.split('\\n')[0]);
    console.log('Last line:', readBack.split('\\n').pop());
} catch (e) {
    console.error('Failed to write file:', e);
}
