import { Entity, PrimaryGeneratedColumn, Column ,OneToMany} from 'typeorm';
import { SerializeOptions } from '@nestjs/common/serializer';
import { CreateDateColumn, UpdateDateColumn } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Exclude } from 'class-transformer';
import { Event } from 'src/events/entities/event.entity';

export enum KYCStatus {
  UNVERIFIED = 'unverified',
  PENDING = 'pending',
  VERIFIED = 'verified'
}

@Entity('user')
@SerializeOptions({ excludeExtraneousValues: true })
export class User {
  @PrimaryGeneratedColumn()
  id: number;


  @Column({ nullable: true })
  firstName: string;

    @Column({ nullable: true })
  lastName: string;

  @Column()
  email: string;

  @Column()
  routingNumber: string;

  @Column({ nullable: true })
  iban: string;

  @Column({nullable:true})
  customer_stripe_id:string;

  @Column({nullable:true})
  customerStripeAccountId:string;
  
  @Column()
  @Exclude()
  password: string;

  @Column()
  verified: boolean | null;

  @Column()
  accessToken: string;

  @Column()
  refreshToken?: string;

 @Column()
  phoneNumber: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({ type: 'json', nullable: true })
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
  };

  @Column({ nullable: true })
  idNumber: string;

  @Column({ type: 'json', nullable: true })
  verificationDocument: {
    front: string;
    back: string;
    additional?: string;
  };

  @Column({
    type: 'enum',
    enum: KYCStatus,
    default: KYCStatus.UNVERIFIED
  })
  kycStatus: KYCStatus;

  @Column({ type: 'json', nullable: true })
  stripeVerificationDetails: {
    requirements: string[];
    currentlyDue: string[];
    eventuallyDue: string[];
    pastDue: string[];
    disabledReason?: string;
  };

  @OneToMany(() => Event, event => event.owner,{ cascade: true })
  events: Event[];
  

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  })
  public updated_at: Date;
  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}
