
import { PrimaryGeneratedColumn ,Column,Entity,OneToOne,JoinColumn, ManyToOne, CreateDateColumn} from "typeorm";
import { Event } from "src/events/entities/event.entity";
import { User } from "src/users/entities/user.entity";
import { isString } from "class-validator";
@Entity('payment')
export class Payment {
    @PrimaryGeneratedColumn()
    pid:number;

    @Column()
    country:string;

    @Column()
    gift_amount:number;

   @Column({ type: 'float', default: 0 })
gift_fee: number;

    
    @Column()
    gift_message:string;
    
    @Column({ nullable: true })
    email:string;

    @Column({ nullable: true })
    sender: string;

    @ManyToOne(() => Event) // Define Many-to-one relationship with Event entity
    @JoinColumn({ name: "eventId",referencedColumnName:"eid" })
    event: Event;

     // Automatically set the current date and time when the entity is created
     @CreateDateColumn({ type: 'timestamp' ,nullable:true})
     created_at: Date;
 
}
