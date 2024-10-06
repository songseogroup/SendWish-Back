import {Module} from "@nestjs/common"
import { ChatGptService } from "./Chatgpt.service"
import { ChatGptController } from "./Chatgpt.controller"

@Module({
    controllers:[ChatGptController],
    providers:[ChatGptService]
})
export class ChatgptModule {}