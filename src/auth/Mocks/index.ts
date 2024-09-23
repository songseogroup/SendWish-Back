const bcrypt = require('bcrypt');
import { User } from '../../users/entities/user.entity';
// auth mocks for loggin user in
export const mock_user_credentials = {
  id: 1,
  username: 'zainmir',
  email: 'zainmir1000@gmail.com',
  password: bcrypt.hash('zain_1234', 10),
  verified: true,
  role: 'user',
};

export const mock_user_correct_credentials_instance = Object.assign(
  new User(),
  mock_user_credentials,
);

// mocks for incorrect credential of user
const mock_incorrect_user_credentials = {
  id: 1,
  username: 'zainmir',
  email: 'zainmir10200@gmail.com',
  password:  bcrypt.hash('zain_1234', 10),
  verified: false,
  role: 'user',
};

export const mock_incorrect_user_credentials_instance = Object.assign(
  new User(),
  mock_incorrect_user_credentials,
);
