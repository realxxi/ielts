import { Module, Injectable, OnModuleInit, Controller, Post, Get, Patch, Body, Param, Req, UseGuards, UnauthorizedException, ForbiddenException, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { MongooseModule, InjectModel } from '@nestjs/mongoose';
import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Model, Types, Schema as MongooseSchema } from 'mongoose';
import { AuthGuard, PassportModule } from '@nestjs/passport';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import * as bcrypt from 'bcryptjs';
import { createHmac, timingSafeEqual, createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { IsEmail, IsIn, IsOptional, IsString, MinLength, IsBoolean, IsArray, ValidateNested, IsNumber, Min, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';

export type Role = 'student' | 'teacher' | 'admin';
@Schema({ timestamps: true }) export class User {
  @Prop({ required: true, unique: true, lowercase: true }) email: string;
  @Prop() passwordHash?: string;
  @Prop({ required: true, enum: ['student','teacher','admin'], default: 'student' }) role: Role;
  @Prop() name: string;
  @Prop({ unique: true, sparse: true }) telegramId?: string;
}
export const UserSchema = SchemaFactory.createForClass(User);
@Schema() export class Lesson { @Prop({ required: true }) title: string; @Prop({ default: '' }) content: string; @Prop({ default: '' }) videoUrl: string; }
export const LessonSchema = SchemaFactory.createForClass(Lesson);
@Schema() export class Section { @Prop({ required: true }) title: string; @Prop({ type: [LessonSchema], default: [] }) lessons: Lesson[]; }
export const SectionSchema = SchemaFactory.createForClass(Section);
@Schema({ timestamps: true }) export class Course {
  @Prop({ required: true }) title: string; @Prop({ required: true }) description: string; @Prop({ default: '' }) coverUrl: string;
  @Prop({ type: Types.ObjectId, ref: User.name, required: true }) teacherId: Types.ObjectId;
  @Prop({ type: [SectionSchema], default: [] }) sections: Section[];
  @Prop({ default: false }) isPaid: boolean; @Prop({ default: 0, min: 0 }) price: number;
  @Prop({ enum: ['pending','approved','rejected','hidden'], default: 'pending' }) status: string;
  @Prop({ type: [String], default: [] }) enrolledUsers: string[];
}
export const CourseSchema = SchemaFactory.createForClass(Course);
@Schema({ timestamps: true }) export class AccessRequest { @Prop({ type: Types.ObjectId, ref: Course.name, required: true }) courseId: string; @Prop({ type: Types.ObjectId, ref: User.name, required: true }) userId: string; @Prop({ enum: ['pending','approved','rejected'], default: 'pending' }) status: string; }
export const AccessRequestSchema = SchemaFactory.createForClass(AccessRequest);
@Schema({ timestamps: true }) export class Progress { @Prop({ required: true }) courseId: string; @Prop({ required: true }) userId: string; @Prop({ type: [String], default: [] }) completedLessons: string[]; }
export const ProgressSchema = SchemaFactory.createForClass(Progress);
@Schema({ _id: false }) export class TestQuestion { @Prop({ required:true }) number:number; @Prop({ required:true }) question:string; @Prop({ type:MongooseSchema.Types.Mixed, required:true }) options:Record<string,string>; @Prop({ required:true, enum:['A','B','C','D'] }) answer:string; }
export const TestQuestionSchema=SchemaFactory.createForClass(TestQuestion);
@Schema({ timestamps:true }) export class LanguageTest { @Prop({ required:true }) title:string; @Prop({ required:true, enum:['A1','A2','B1','B2','C1','C2'] }) level:string; @Prop({ type:[TestQuestionSchema], default:[] }) questions:TestQuestion[]; @Prop({ default:true }) published:boolean; @Prop({ unique:true, sparse:true }) seedKey?:string; @Prop({ type:Types.ObjectId, ref:User.name, required:true }) createdBy:Types.ObjectId; }
export const LanguageTestSchema=SchemaFactory.createForClass(LanguageTest);
@Schema({ timestamps:true }) export class TestAttempt { @Prop({ type:Types.ObjectId, ref:LanguageTest.name, required:true }) testId:string; @Prop({ type:Types.ObjectId, ref:User.name, required:true }) userId:string; @Prop({ required:true }) score:number; @Prop({ required:true }) total:number; @Prop({ type:MongooseSchema.Types.Mixed, required:true }) answers:Record<string,string>; }
export const TestAttemptSchema=SchemaFactory.createForClass(TestAttempt);

export class RegisterDto { @IsEmail() email: string; @MinLength(8) password: string; @IsString() @MinLength(2) name: string; @IsIn(['student','teacher']) role: Role; }
export class LoginDto { @IsEmail() email: string; @IsString() password: string; }
export class TelegramDto { @IsNumber() id: number; @IsNumber() auth_date: number; @IsString() hash: string; @IsString() @IsOptional() first_name?: string; @IsString() @IsOptional() last_name?: string; @IsString() @IsOptional() username?: string; @IsString() @IsOptional() photo_url?: string; @IsIn(['student','teacher']) @IsOptional() role?: Role; }
export class LessonDto { @IsString() title: string; @IsString() @IsOptional() content?: string; @IsString() @IsOptional() videoUrl?: string; }
export class SectionDto { @IsString() title: string; @IsArray() @ValidateNested({ each: true }) @Type(() => LessonDto) lessons: LessonDto[]; }
export class CourseDto { @IsString() title: string; @IsString() description: string; @IsString() @IsOptional() coverUrl?: string; @IsBoolean() isPaid: boolean; @IsNumber() @Min(0) @IsOptional() price?: number; @IsArray() @ValidateNested({ each: true }) @Type(() => SectionDto) sections: SectionDto[]; }
export class ReviewDto { @IsIn(['approved','rejected','hidden']) status: string; }
export class AccessReviewDto { @IsIn(['approved','rejected']) status: string; }
export class ProgressDto { @IsArray() completedLessons: string[]; }

@Injectable() export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) { super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), secretOrKey: config.get('JWT_SECRET') }); }
  async validate(payload: any) { return { id: payload.sub, email: payload.email, role: payload.role, name: payload.name }; }
}
export const JwtAuth = AuthGuard('jwt');
export function allow(...roles: Role[]) { return (target: any, key: string, descriptor: PropertyDescriptor) => { const original = descriptor.value; descriptor.value = function (...args: any[]) { const req = args.find(x => x?.user); if (!req?.user) throw new UnauthorizedException(); if (!roles.includes(req.user.role)) throw new ForbiddenException(); return original.apply(this, args); }; return descriptor; }; }

@Injectable() export class AuthService implements OnModuleInit {
  constructor(@InjectModel(User.name) private users: Model<User>, @InjectModel(LanguageTest.name) private tests:Model<LanguageTest>, private jwt: JwtService, private config: ConfigService) {}
  async onModuleInit() {
    const email = this.config.get('ADMIN_EMAIL'), password = this.config.get('ADMIN_PASSWORD');
    if (!email || !password) return;
    const hash = await bcrypt.hash(password, 12);
    await this.users.findOneAndUpdate({ email: email.toLowerCase() }, { $setOnInsert: { email: email.toLowerCase(), passwordHash: hash, role: 'admin', name: 'Administrator' } }, { upsert: true, new: true });
    const admin:any=await this.users.findOne({email:email.toLowerCase()});
    const initial:any=JSON.parse(readFileSync(join(__dirname,'../data/turkish-tests.json'),'utf8'));
    for(const group of initial.tests||[]) await this.tests.findOneAndUpdate({seedKey:`initial:${group.level}`},{$setOnInsert:{seedKey:`initial:${group.level}`,title:`Turk tili ${group.level} testi`,level:group.level,questions:group.questions,published:true,createdBy:admin._id}},{upsert:true,new:true});
  }
  private async token(user: any) { return { accessToken: await this.jwt.signAsync({ sub: user._id.toString(), email: user.email, role: user.role, name: user.name }), user: { id: user._id, email: user.email, role: user.role, name: user.name } }; }
  async register(dto: RegisterDto) { if (await this.users.exists({ email: dto.email.toLowerCase() })) throw new ConflictException('Bu email ro‘yxatdan o‘tgan'); const user = await this.users.create({ email: dto.email.toLowerCase(), passwordHash: await bcrypt.hash(dto.password, 12), name: dto.name, role: dto.role }); return this.token(user); }
  async login(dto: LoginDto) { const user = await this.users.findOne({ email: dto.email.toLowerCase() }); if (!user?.passwordHash || !await bcrypt.compare(dto.password, user.passwordHash)) throw new UnauthorizedException('Email yoki parol noto‘g‘ri'); return this.token(user); }
  async telegram(payload: TelegramDto) {
    const botToken = this.config.get('TELEGRAM_BOT_TOKEN'); if (!botToken) throw new BadRequestException('Telegram login sozlanmagan');
    const { hash, ...fields } = payload; const data = Object.entries(fields).filter(([k,v]) => k !== 'role' && v !== undefined).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${k}=${v}`).join('\n');
    const secret = createHash('sha256').update(botToken).digest(); const digest = createHmac('sha256',secret).update(data).digest('hex');
    if (digest.length !== hash.length || !timingSafeEqual(Buffer.from(digest), Buffer.from(hash))) throw new UnauthorizedException('Telegram ma’lumotlari noto‘g‘ri');
    const authDate = Number(payload.auth_date); if (!authDate || Math.abs(Date.now()/1000-authDate) > 86400) throw new UnauthorizedException('Telegram sessiyasi eskirgan');
    const email = `tg_${payload.id}@telegram.local`; const existing = await this.users.findOne({ telegramId: String(payload.id) });
    const user = existing || await this.users.create({ telegramId: String(payload.id), email, name: [payload.first_name,payload.last_name].filter(Boolean).join(' ') || payload.username || 'Telegram foydalanuvchisi', role: payload.role || 'student' });
    return this.token(user);
  }
}
@ApiTags('auth') @Controller('auth') export class AuthController {
 constructor(private auth: AuthService) {}
 @Post('register') register(@Body() dto: RegisterDto) { return this.auth.register(dto); }
 @Post('login') login(@Body() dto: LoginDto) { return this.auth.login(dto); }
 @Post('telegram') telegram(@Body() dto: TelegramDto) { return this.auth.telegram(dto); }
}

@ApiTags('courses') @Controller('courses') export class CoursesController {
 constructor(@InjectModel(Course.name) private courses: Model<Course>, @InjectModel(AccessRequest.name) private requests: Model<AccessRequest>, @InjectModel(Progress.name) private progress: Model<Progress>) {}
 @Get() async list(@Req() req: any) { const filter: any = { status: 'approved' }; if (req.user?.role === 'teacher') filter.teacherId = req.user.id; return this.courses.find(filter).populate('teacherId','name').lean(); }
 @Get('mine') @UseGuards(JwtAuth) @ApiBearerAuth() async mine(@Req() req:any) { if(req.user.role==='teacher') return this.courses.find({teacherId:req.user.id}).lean(); if(req.user.role==='admin') return this.courses.find().lean(); throw new ForbiddenException(); }
 @Post() @UseGuards(JwtAuth) @ApiBearerAuth() async create(@Req() req: any, @Body() dto: CourseDto) { if (!['teacher','admin'].includes(req.user.role)) throw new ForbiddenException(); return this.courses.create({ ...dto, teacherId: req.user.id, status: req.user.role==='admin'?'approved':'pending' }); }
 @Patch(':id') @UseGuards(JwtAuth) @ApiBearerAuth() async update(@Param('id') id:string,@Req() req:any,@Body() dto:CourseDto) { if(!['teacher','admin'].includes(req.user.role)) throw new ForbiddenException(); const course=req.user.role==='admin'?await this.courses.findById(id):await this.courses.findOne({_id:id,teacherId:req.user.id}); if(!course) throw new NotFoundException(); Object.assign(course,dto,{status:req.user.role==='admin'?'approved':'pending'}); return course.save(); }
 @Get(':id') async detail(@Param('id') id: string, @Req() req: any) { const course = await this.courses.findById(id).populate('teacherId','name').lean(); if (!course || (course.status !== 'approved' && req.user?.role !== 'admin' && String(course.teacherId?._id || course.teacherId) !== req.user?.id)) throw new NotFoundException(); const unlocked = req.user?.role === 'admin' || !course.isPaid || course.enrolledUsers?.includes(req.user?.id); if (!unlocked) return { ...course, sections: course.sections.map((s: any) => ({ ...s, lessons: s.lessons.map((l: any) => ({ _id:l._id,title:l.title,locked:true })) })), locked: true }; return course; }
 @Post(':id/request-access') @UseGuards(JwtAuth) @ApiBearerAuth() async request(@Param('id') id: string, @Req() req: any) { if (req.user.role !== 'student') throw new ForbiddenException(); const course = await this.courses.findById(id); if (!course || course.status !== 'approved' || !course.isPaid) throw new NotFoundException(); const exists = await this.requests.findOne({ courseId:id,userId:req.user.id,status:'pending' }); if (exists) return exists; return this.requests.create({ courseId:id,userId:req.user.id }); }
 @Post(':id/progress') @UseGuards(JwtAuth) @ApiBearerAuth() async saveProgress(@Param('id') id: string, @Req() req: any, @Body() dto: ProgressDto) { const course = await this.courses.findById(id); if (!course || (course.isPaid && req.user.role !== 'admin' && !course.enrolledUsers.includes(req.user.id))) throw new ForbiddenException(); return this.progress.findOneAndUpdate({ courseId:id,userId:req.user.id }, { $set:{ completedLessons:dto.completedLessons } }, { upsert:true,new:true }); }
 @Get(':id/progress') @UseGuards(JwtAuth) @ApiBearerAuth() async getProgress(@Param('id') id: string, @Req() req: any) { return await this.progress.findOne({ courseId:id,userId:req.user.id }) || { completedLessons:[] }; }
}

@ApiTags('tests') @Controller('tests') export class TestsController {
 constructor(@InjectModel(LanguageTest.name) private tests:Model<LanguageTest>,@InjectModel(TestAttempt.name) private attempts:Model<TestAttempt>){}
 @Get() list(){return this.tests.find({published:true},{title:1,level:1,'questions.number':1}).lean().then(rows=>rows.map((t:any)=>({...t,questionCount:t.questions?.length||0,questions:undefined})));}
 @Get('manage') @UseGuards(JwtAuth) @ApiBearerAuth() async manage(@Req() req:any){if(req.user?.role!=='admin')throw new ForbiddenException();return this.tests.find({}, {title:1,level:1,'questions.number':1,createdAt:1}).sort({level:1}).lean().then(rows=>rows.map((t:any)=>({...t,questionCount:t.questions?.length||0,questions:undefined})));}
 @Get(':id') async detail(@Param('id') id:string){const test:any=await this.tests.findOne({_id:id,published:true}).lean();if(!test)throw new NotFoundException();return{_id:test._id,title:test.title,level:test.level,questions:test.questions.map((q:any)=>({number:q.number,question:q.question,options:q.options}))};}
 @Post(':id/submit') @UseGuards(JwtAuth) @ApiBearerAuth() async submit(@Param('id') id:string,@Req() req:any,@Body('answers') answers:Record<string,string>){if(!['student','admin'].includes(req.user.role))throw new ForbiddenException();const test:any=await this.tests.findOne({_id:id,published:true}).lean();if(!test)throw new NotFoundException();if(!answers||typeof answers!=='object'||Array.isArray(answers))throw new BadRequestException('Javoblarni yuboring');for(const [key,value] of Object.entries(answers)){if(!test.questions.some((q:any)=>String(q.number)===key)||!['A','B','C','D'].includes(value))throw new BadRequestException('Javob formati noto‘g‘ri');}const score=test.questions.filter((q:any)=>answers[String(q.number)]===q.answer).length;await this.attempts.create({testId:id,userId:req.user.id,score,total:test.questions.length,answers});return{score,total:test.questions.length,percentage:Math.round(score*100/test.questions.length),results:test.questions.map((q:any)=>({number:q.number,selected:answers[String(q.number)]||null,correctAnswer:q.answer,correct:answers[String(q.number)]===q.answer}))};}
}

@ApiTags('admin') @ApiBearerAuth() @UseGuards(JwtAuth) @Controller('admin') export class AdminController {
 constructor(@InjectModel(User.name) private users: Model<User>, @InjectModel(Course.name) private courses: Model<Course>, @InjectModel(AccessRequest.name) private requests: Model<AccessRequest>,@InjectModel(LanguageTest.name) private tests:Model<LanguageTest>) {}
 private check(req: any) { if (req.user.role !== 'admin') throw new ForbiddenException(); }
 @Get('users') usersList(@Req() req: any) { this.check(req); return this.users.find({}, { passwordHash:0 }).sort({createdAt:-1}).lean(); }
 @Patch('users/:id/role') async setRole(@Param('id') id:string,@Req() req:any,@Body('role') role:Role) { this.check(req); if(!['student','teacher','admin'].includes(role)) throw new BadRequestException('Noto‘g‘ri rol'); if(id===req.user.id&&role!=='admin') throw new BadRequestException('O‘zingizning admin rolingizni o‘zgartira olmaysiz'); return this.users.findByIdAndUpdate(id,{role},{new:true,projection:{passwordHash:0}}); }
 @Get('courses') coursesList(@Req() req: any) { this.check(req); return this.courses.find().populate('teacherId','name email').lean(); }
 @Patch('courses/:id/review') async review(@Param('id') id: string, @Req() req: any, @Body() dto: ReviewDto) { this.check(req); return this.courses.findByIdAndUpdate(id,{status:dto.status},{new:true}); }
 @Patch('courses/:id/free') async free(@Param('id') id: string, @Req() req: any, @Body('isPaid') isPaid: boolean) { this.check(req); return this.courses.findByIdAndUpdate(id,{isPaid:!!isPaid},{new:true}); }
 @Get('access-requests') async listRequests(@Req() req: any) { this.check(req); return this.requests.find({status:'pending'}).populate('courseId').populate('userId','name email').lean(); }
 @Get('tests') async listTests(@Req() req:any){this.check(req);return this.tests.find({}, {title:1,level:1,'questions.number':1,createdAt:1}).sort({level:1}).lean().then(rows=>rows.map((t:any)=>({...t,questionCount:t.questions?.length||0,questions:undefined})));}
 @Post('tests/import') async importTests(@Req() req:any,@Body() body:any){this.check(req);const groups=Array.isArray(body?.tests)?body.tests:[body];if(!groups.length)throw new BadRequestException('JSON ichida tests ro‘yxati bo‘lishi kerak');const supported=['A1','A2','B1','B2','C1','C2'];const imported=[];for(const group of groups){if(!supported.includes(group?.level)||!Array.isArray(group?.questions)||!group.questions.length)throw new BadRequestException('Har bir testda level va savollar ro‘yxati bo‘lishi kerak');for(const q of group.questions){if(!Number.isInteger(q.number)||typeof q.question!=='string'||!q.question.trim()||!q.options||!['A','B','C','D'].every(k=>typeof q.options[k]==='string')||!['A','B','C','D'].includes(q.answer))throw new BadRequestException(`Savol formati noto‘g‘ri: ${q.number||'?'}`);}const title=group.title||body.title||`Turk tili ${group.level} testi`;const test=await this.tests.findOneAndUpdate({title,level:group.level,createdBy:req.user.id},{$set:{title,level:group.level,questions:group.questions,published:true,createdBy:req.user.id}}, {upsert:true,new:true,setDefaultsOnInsert:true});imported.push({id:test._id,title:test.title,level:test.level,questionCount:test.questions.length});}return{imported};}
 @Patch('access-requests/:id') async reviewAccess(@Param('id') id: string, @Req() req: any, @Body() dto: AccessReviewDto) { this.check(req); const request: any = await this.requests.findByIdAndUpdate(id,{status:dto.status},{new:true}); if (!request) throw new NotFoundException(); if(dto.status==='approved') await this.courses.findByIdAndUpdate(request.courseId,{$addToSet:{enrolledUsers:request.userId}}); return request; }
}

@Module({ imports:[ConfigModule.forRoot({isGlobal:true}),MongooseModule.forRootAsync({imports:[ConfigModule],inject:[ConfigService],useFactory:(c:ConfigService)=>({uri:c.get('MONGODB_URI','mongodb://127.0.0.1:27017/tilshunos')})}),MongooseModule.forFeature([{name:User.name,schema:UserSchema},{name:Course.name,schema:CourseSchema},{name:AccessRequest.name,schema:AccessRequestSchema},{name:Progress.name,schema:ProgressSchema},{name:LanguageTest.name,schema:LanguageTestSchema},{name:TestAttempt.name,schema:TestAttemptSchema}]),JwtModule.registerAsync({global:true,imports:[ConfigModule],inject:[ConfigService],useFactory:(c:ConfigService)=>({secret:c.get('JWT_SECRET'),signOptions:{expiresIn:c.get('JWT_EXPIRES_IN','7d')}})}),PassportModule.register({defaultStrategy:'jwt'})],controllers:[AuthController,CoursesController,TestsController,AdminController],providers:[AuthService,JwtStrategy]}) export class AppModule {}
