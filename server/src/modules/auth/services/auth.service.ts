import { injectable } from 'tsyringe';
import { BadRequestException, ConflictException } from 'src/common/exceptions';
import { PasswordService } from './password.service';
import { PrismaClient, User } from '@prisma/client';
import { prismaService } from 'src/providers/db';

@injectable()
export class AuthService {
  private _db: PrismaClient;
  constructor(private passwordService: PasswordService) {
    this._db = prismaService;
  }

  public async registerUser(data: RegisterUserDto): Promise<User> {
    const { email, first_name, last_name, birthdate, city, country, street, zip } = data;
    const check = await this.userService.getUserByEmail(email);
    if (check) {
      throw new ConflictException(`User with email ${email} already existed`);
    }

    let password = await this.passwordService.hash(data.password);

    const userTemp = new User({
      email,
      password,
      first_name,
      last_name,
      birthdate,
      street,
      city,
      country,
      zip,
    });
    const mutation = `
    INSERT INTO "users" (email, password, first_name, last_name, 
                        full_name, birthdate, street, 
                        city, country, zip, status, 
                        createdAt, updatedAt)

                VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?);
    `;
    const values = [
      email,
      password,
      first_name,
      last_name,
      userTemp.full_name,
      birthdate,
      street,
      city,
      country,
      zip,
      'ACTIVE',
      userTemp.createdAt,
      userTemp.updatedAt,
    ];

    await this._db.run(mutation, values);
    const userCreated: User = await this._db.get(`SELECT * from "users" WHERE email='${email}'`);
    return userCreated;
  }

  public async loginUser(data: LoginUserDto): Promise<User> {
    const { email, password } = data;
    const user: User = await this.userService.getUserByEmail(email);
    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }
    const isMatch = await this.passwordService.verify(user.password, password);
    if (!isMatch) {
      throw new BadRequestException('Invalid credentials');
    }
    return user;
  }
}
