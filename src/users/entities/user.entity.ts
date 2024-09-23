import { Entity, PrimaryGeneratedColumn, Column ,OneToMany} from 'typeorm';
import { SerializeOptions } from '@nestjs/common/serializer';
import { CreateDateColumn, UpdateDateColumn } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Exclude } from 'class-transformer';
import { Event } from 'src/events/entities/event.entity';
@Entity('user')
@SerializeOptions({ excludeExtraneousValues: true })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  username: string;

  @Column()
  email: string;


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
