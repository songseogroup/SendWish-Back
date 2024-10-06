import {Module} from "@nestjs/common"
import { ChatGptService } from "./Chatgpt.service"
import { ChatGptController } from "./chatgpt.controller"

@Module({
    controllers:[ChatGptController],
    providers:[ChatGptService]
})
export class ChatgptModule {}