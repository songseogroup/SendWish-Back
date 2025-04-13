interface User {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    customer_stripe_id?: string;
    customerStripeAccountId?:string;
    verified: boolean;
    accessToken?: string;
    refreshToken?: string;
    created_at: Date; // or you can use Date type if you prefer
    updated_at: Date; // or you can use Date type if you prefer
}

export interface TEvent {
    eid: number;
    date: any|string; // consider using Date type if you prefer
    event_name: string;
    event_url: string;
    image: string;
    event_description: string;
    created_at: Date; // or you can use Date type if you prefer
    updated_at: Date; // or you can use Date type if you prefer
    owner?: User;
    // gift_message: string;
    // gift_amount: number;
    // gift_from: string;
    // country: string;
 
}

