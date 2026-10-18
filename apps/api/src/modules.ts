import { Module, Injectable, OnModuleInit, Controller, Post, Get, Patch, Delete, Body, Param, Req, UseGuards, UnauthorizedException, ForbiddenException, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
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
import { IsEmail, IsIn, IsOptional, IsString, MinLength, IsBoolean, IsArray, ValidateNested, IsNumber, IsInt, Min, IsMongoId, ArrayMinSize } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export type Role = 'student' | 'teacher' | 'admin';
@Schema({ timestamps: true }) export class User {
  @Prop({ required: true, unique: true, lowercase: true }) email: string;
  @Prop() passwordHash?: string;
  @Prop({ required: true, enum: ['student','teacher','admin'], default: 'student' }) role: Role;
  @Prop() name: string;
  @Prop() avatarUrl?: string;
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

export class RegisterDto { @Transform(({value}) => typeof value === 'string' ? value.trim().toLowerCase() : value) @IsEmail({}, { message: 'To‘g‘ri email manzilini kiriting' }) email: string; @MinLength(8, { message: 'Parol kamida 8 belgidan iborat bo‘lsin' }) password: string; @Transform(({value}) => typeof value === 'string' ? value.trim() : value) @IsString() @MinLength(2, { message: 'Ism kamida 2 belgidan iborat bo‘lsin' }) name: string; @IsIn(['student','teacher']) role: Role; }
export class LoginDto { @Transform(({value}) => typeof value === 'string' ? value.trim().toLowerCase() : value) @IsEmail({}, { message: 'To‘g‘ri email manzilini kiriting' }) email: string; @IsString() password: string; }
export class UpdateProfileDto { @IsString() @MinLength(2) name: string; @IsString() @IsOptional() avatarUrl?: string; }
export class TelegramDto { @IsNumber() id: number; @IsNumber() auth_date: number; @IsString() hash: string; @IsString() @IsOptional() first_name?: string; @IsString() @IsOptional() last_name?: string; @IsString() @IsOptional() username?: string; @IsString() @IsOptional() photo_url?: string; @IsIn(['student','teacher']) @IsOptional() role?: Role; }
export class LessonDto { @IsString() title: string; @IsString() @IsOptional() content?: string; @IsString() @IsOptional() videoUrl?: string; }
export class SectionDto { @IsString() title: string; @IsArray() @ValidateNested({ each: true }) @Type(() => LessonDto) lessons: LessonDto[]; }
export class CourseDto { @IsString() title: string; @IsString() description: string; @IsString() @IsOptional() coverUrl?: string; @IsBoolean() isPaid: boolean; @IsNumber() @Min(0) @IsOptional() price?: number; @IsArray() @ValidateNested({ each: true }) @Type(() => SectionDto) sections: SectionDto[]; }
export class TestOptionsDto { @IsString() @MinLength(1) A: string; @IsString() @MinLength(1) B: string; @IsString() @MinLength(1) C: string; @IsString() @MinLength(1) D: string; }
export class TestQuestionDto { @IsInt() @Min(1) number: number; @IsString() @MinLength(1) question: string; @ValidateNested() @Type(() => TestOptionsDto) options: TestOptionsDto; @IsIn(['A','B','C','D']) answer: string; }
export class CreateTestDto { @IsString() @MinLength(2) title: string; @IsIn(['A1','A2','B1','B2','C1','C2']) level: string; @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => TestQuestionDto) questions: TestQuestionDto[]; }
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
    const adminEmail = email.trim().toLowerCase();
    await this.users.findOneAndUpdate({ email: adminEmail }, { $set: { passwordHash: hash, role: 'admin' }, $setOnInsert: { email: adminEmail, name: 'Administrator' } }, { upsert: true, new: true });
    const admin:any=await this.users.findOne({email:adminEmail});
    const initial:any=JSON.parse(readFileSync(join(__dirname,'../data/turkish-tests.json'),'utf8'));
    for(const group of initial.tests||[]) await this.tests.findOneAndUpdate({seedKey:`initial:${group.level}`},{$setOnInsert:{seedKey:`initial:${group.level}`,title:`Turk tili ${group.level} testi`,level:group.level,questions:group.questions,published:true,createdBy:admin._id}},{upsert:true,new:true});
  }
  private async token(user: any) { return { accessToken: await this.jwt.signAsync({ sub: user._id.toString(), email: user.email, role: user.role, name: user.name }), user: { id: user._id, email: user.email, role: user.role, name: user.name, avatarUrl: user.avatarUrl } }; }
  async getProfile(userId: string) { const user = await this.users.findById(userId, { passwordHash: 0 }).lean(); if (!user) throw new NotFoundException('Foydalanuvchi topilmadi'); return user; }
  async updateProfile(userId: string, dto: UpdateProfileDto) { const avatarUrl = dto.avatarUrl?.trim() || ''; if (avatarUrl && !/^https:\/\//i.test(avatarUrl)) throw new BadRequestException('Profil rasmi uchun HTTPS havola kiriting'); const user = await this.users.findByIdAndUpdate(userId, { $set: { name: dto.name.trim(), avatarUrl } }, { new: true, projection: { passwordHash: 0 } }).lean(); if (!user) throw new NotFoundException('Foydalanuvchi topilmadi'); return user; }
  async register(dto: RegisterDto) { const email = dto.email.trim().toLowerCase(); if (await this.users.exists({ email })) throw new ConflictException('Bu email ro‘yxatdan o‘tgan'); const user = await this.users.create({ email, passwordHash: await bcrypt.hash(dto.password, 12), name: dto.name.trim(), role: dto.role }); return this.token(user); }
  async login(dto: LoginDto) { const user = await this.users.findOne({ email: dto.email.trim().toLowerCase() }); if (!user?.passwordHash || !await bcrypt.compare(dto.password, user.passwordHash)) throw new UnauthorizedException('Email yoki parol noto‘g‘ri'); return this.token(user); }
  async telegram(payload: TelegramDto) {
    const botToken = this.config.get('TELEGRAM_BOT_TOKEN'); if (!botToken) throw new BadRequestException('Telegram login sozlanmagan');
    const { hash, ...fields } = payload; const data = Object.entries(fields).filter(([k,v]) => k !== 'role' && v !== undefined).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${k}=${v}`).join('\n');
    const secret = createHash('sha256').update(botToken).digest(); const digest = createHmac('sha256',secret).update(data).digest('hex');
    if (digest.length !== hash.length || !timingSafeEqual(Buffer.from(digest), Buffer.from(hash))) throw new UnauthorizedException('Telegram ma’lumotlari noto‘g‘ri');
    const authDate = Number(payload.auth_date); if (!authDate || Math.abs(Date.now()/1000-authDate) > 86400) throw new UnauthorizedException('Telegram sessiyasi eskirgan');
    const email = `tg_${payload.id}@telegram.local`; const existing = await this.users.findOne({ telegramId: String(payload.id) });
    const user = existing || await this.users.create({ telegramId: String(payload.id), email, name: [payload.first_name,payload.last_name].filter(Boolean).join(' ') || payload.username || 'Telegram foydalanuvchisi', avatarUrl: payload.photo_url, role: payload.role || 'student' });
    return this.token(user);
  }
}
@ApiTags('auth') @Controller('auth') export class AuthController {
 constructor(private auth: AuthService) {}
 @Post('register') register(@Body() dto: RegisterDto) { return this.auth.register(dto); }
 @Post('login') login(@Body() dto: LoginDto) { return this.auth.login(dto); }
 @Post('telegram') telegram(@Body() dto: TelegramDto) { return this.auth.telegram(dto); }
 @Get('me') @UseGuards(JwtAuth) @ApiBearerAuth() me(@Req() req: any) { return this.auth.getProfile(req.user.id); }
 @Patch('me') @UseGuards(JwtAuth) @ApiBearerAuth() updateMe(@Req() req: any, @Body() dto: UpdateProfileDto) { return this.auth.updateProfile(req.user.id, dto); }
}

@ApiTags('courses') @Controller('courses') export class CoursesController {
 constructor(@InjectModel(Course.name) private courses: Model<Course>, @InjectModel(AccessRequest.name) private requests: Model<AccessRequest>, @InjectModel(Progress.name) private progress: Model<Progress>) {}
 @Get() async list(@Req() req: any) { const filter: any = { status: 'approved' }; if (req.user?.role === 'teacher') filter.teacherId = req.user.id; return this.courses.find(filter).populate('teacherId','name').lean(); }
 @Get('mine') @UseGuards(JwtAuth) @ApiBearerAuth() async mine(@Req() req:any) { if(req.user.role==='teacher') return this.courses.find({teacherId:req.user.id}).lean(); if(req.user.role==='admin') return this.courses.find().lean(); throw new ForbiddenException(); }
 @Post() @UseGuards(JwtAuth) @ApiBearerAuth() async create(@Req() req: any, @Body() dto: CourseDto) { if (!['teacher','admin'].includes(req.user.role)) throw new ForbiddenException(); return this.courses.create({ ...dto, teacherId: req.user.id, status: req.user.role==='admin'?'approved':'pending' }); }
 @Patch(':id') @UseGuards(JwtAuth) @ApiBearerAuth() async update(@Param('id') id:string,@Req() req:any,@Body() dto:CourseDto) { if(!['teacher','admin'].includes(req.user.role)) throw new ForbiddenException(); const course=req.user.role==='admin'?await this.courses.findById(id):await this.courses.findOne({_id:id,teacherId:req.user.id}); if(!course) throw new NotFoundException(); Object.assign(course,dto,{status:req.user.role==='admin'?'approved':'pending'}); return course.save(); }
 @Delete(':id') @UseGuards(JwtAuth) @ApiBearerAuth() async remove(@Param('id') id:string,@Req() req:any) { if(!['teacher','admin'].includes(req.user.role)) throw new ForbiddenException(); const course=req.user.role==='admin'?await this.courses.findById(id):await this.courses.findOne({_id:id,teacherId:req.user.id}); if(!course) throw new NotFoundException('Kurs topilmadi'); await this.requests.deleteMany({courseId:id}); await this.progress.deleteMany({courseId:id}); await this.courses.deleteOne({_id:id}); return {deleted:true,id}; }
 @Get(':id') async detail(@Param('id') id: string, @Req() req: any) { const course = await this.courses.findById(id).populate('teacherId','name').lean(); if (!course || (course.status !== 'approved' && req.user?.role !== 'admin' && String(course.teacherId?._id || course.teacherId) !== req.user?.id)) throw new NotFoundException(); const unlocked = req.user?.role === 'admin' || !course.isPaid || course.enrolledUsers?.includes(req.user?.id); if (!unlocked) return { ...course, sections: course.sections.map((s: any) => ({ ...s, lessons: s.lessons.map((l: any) => ({ _id:l._id,title:l.title,locked:true })) })), locked: true }; return course; }
 @Post(':id/request-access') @UseGuards(JwtAuth) @ApiBearerAuth() async request(@Param('id') id: string, @Req() req: any) { if (req.user.role !== 'student') throw new ForbiddenException(); const course = await this.courses.findById(id); if (!course || course.status !== 'approved' || !course.isPaid) throw new NotFoundException(); const exists = await this.requests.findOne({ courseId:id,userId:req.user.id,status:'pending' }); if (exists) return exists; return this.requests.create({ courseId:id,userId:req.user.id }); }
 @Post(':id/progress') @UseGuards(JwtAuth) @ApiBearerAuth() async saveProgress(@Param('id') id: string, @Req() req: any, @Body() dto: ProgressDto) { const course = await this.courses.findById(id); if (!course || (course.isPaid && req.user.role !== 'admin' && !course.enrolledUsers.includes(req.user.id))) throw new ForbiddenException(); return this.progress.findOneAndUpdate({ courseId:id,userId:req.user.id }, { $set:{ completedLessons:dto.completedLessons } }, { upsert:true,new:true }); }
 @Get(':id/progress') @UseGuards(JwtAuth) @ApiBearerAuth() async getProgress(@Param('id') id: string, @Req() req: any) { return await this.progress.findOne({ courseId:id,userId:req.user.id }) || { completedLessons:[] }; }
}

@ApiTags('tests') @Controller('tests') export class TestsController {
 constructor(@InjectModel(LanguageTest.name) private tests:Model<LanguageTest>,@InjectModel(TestAttempt.name) private attempts:Model<TestAttempt>){}
 @Get() list(){return this.tests.find({published:true},{title:1,level:1,'questions.number':1}).lean().then(rows=>rows.map((t:any)=>({...t,questionCount:t.questions?.length||0,questions:undefined})));}
 @Get('mine') @UseGuards(JwtAuth) @ApiBearerAuth() async mine(@Req() req:any){if(req.user?.role!=='teacher'&&req.user?.role!=='admin')throw new ForbiddenException();return this.tests.find(req.user.role==='admin'?{}:{createdBy:req.user.id},{title:1,level:1,'questions.number':1,createdAt:1}).sort({createdAt:-1}).lean().then(rows=>rows.map((t:any)=>({...t,questionCount:t.questions?.length||0,questions:undefined})));}
 @Post() @UseGuards(JwtAuth) @ApiBearerAuth() async create(@Req() req:any,@Body() dto:CreateTestDto){if(req.user?.role!=='teacher')throw new ForbiddenException();const numbers=dto.questions.map(q=>q.number);if(new Set(numbers).size!==numbers.length)throw new BadRequestException('Savol raqamlari takrorlanmasligi kerak');return this.tests.create({...dto,createdBy:req.user.id,published:true});}
 @Get(':id/manage') @UseGuards(JwtAuth) @ApiBearerAuth() async getForEdit(@Param('id') id:string,@Req() req:any){if(!['teacher','admin'].includes(req.user.role))throw new ForbiddenException();const test:any=await this.tests.findById(id).lean();if(!test)throw new NotFoundException('Test topilmadi');if(req.user.role==='teacher'&&String(test.createdBy)!==req.user.id)throw new ForbiddenException();return test;}
 @Patch(':id') @UseGuards(JwtAuth) @ApiBearerAuth() async update(@Param('id') id:string,@Req() req:any,@Body() dto:CreateTestDto){if(!['teacher','admin'].includes(req.user.role))throw new ForbiddenException();const test=await this.tests.findById(id);if(!test)throw new NotFoundException('Test topilmadi');if(req.user.role==='teacher'&&String(test.createdBy)!==req.user.id)throw new ForbiddenException();const numbers=dto.questions.map(q=>q.number);if(new Set(numbers).size!==numbers.length)throw new BadRequestException('Savol raqamlari takrorlanmasligi kerak');Object.assign(test,dto);return test.save();}
 @Delete(':id') @UseGuards(JwtAuth) @ApiBearerAuth() async remove(@Param('id') id:string,@Req() req:any){if(!['teacher','admin'].includes(req.user.role))throw new ForbiddenException();const test=await this.tests.findById(id);if(!test)throw new NotFoundException('Test topilmadi');if(req.user.role==='teacher'&&String(test.createdBy)!==req.user.id)throw new ForbiddenException();await this.attempts.deleteMany({testId:id});await this.tests.deleteOne({_id:id});return{deleted:true,id};}
 @Get('manage') @UseGuards(JwtAuth) @ApiBearerAuth() async manage(@Req() req:any){if(req.user?.role!=='admin')throw new ForbiddenException();return this.tests.find({}, {title:1,level:1,'questions.number':1,createdAt:1}).sort({level:1}).lean().then(rows=>rows.map((t:any)=>({...t,questionCount:t.questions?.length||0,questions:undefined})));}
 @Get(':id') async detail(@Param('id') id:string){const test:any=await this.tests.findOne({_id:id,published:true}).lean();if(!test)throw new NotFoundException();return{_id:test._id,title:test.title,level:test.level,questions:test.questions.map((q:any)=>({number:q.number,question:q.question,options:q.options}))};}
 @Post(':id/submit') async submit(@Param('id') id:string,@Req() req:any,@Body('answers') answers:Record<string,string>){const test:any=await this.tests.findOne({_id:id,published:true}).lean();if(!test)throw new NotFoundException();if(!answers||typeof answers!=='object'||Array.isArray(answers))throw new BadRequestException('Javoblarni yuboring');for(const [key,value] of Object.entries(answers)){if(!test.questions.some((q:any)=>String(q.number)===key)||!['A','B','C','D'].includes(value))throw new BadRequestException('Javob formati noto‘g‘ri');}const score=test.questions.filter((q:any)=>answers[String(q.number)]===q.answer).length;if(req.user&&['student','admin'].includes(req.user.role))await this.attempts.create({testId:id,userId:req.user.id,score,total:test.questions.length,answers});return{score,total:test.questions.length,percentage:Math.round(score*100/test.questions.length),results:test.questions.map((q:any)=>({number:q.number,selected:answers[String(q.number)]||null,correctAnswer:q.answer,correct:answers[String(q.number)]===q.answer}))};}
}

@ApiTags('admin') @ApiBearerAuth() @UseGuards(JwtAuth) @Controller('admin') export class AdminController {
 constructor(@InjectModel(User.name) private users: Model<User>, @InjectModel(Course.name) private courses: Model<Course>, @InjectModel(AccessRequest.name) private requests: Model<AccessRequest>, @InjectModel(Progress.name) private progress: Model<Progress>, @InjectModel(LanguageTest.name) private tests: Model<LanguageTest>, @InjectModel(TestAttempt.name) private attempts: Model<TestAttempt>, private config: ConfigService) {}
 private check(req: any) { if (req.user.role !== 'admin') throw new ForbiddenException(); }
 @Get('users') usersList(@Req() req: any) { this.check(req); return this.users.find({}, { passwordHash:0 }).sort({createdAt:-1}).lean(); }
 @Patch('users/:id/role') async setRole(@Param('id') id:string,@Req() req:any,@Body('role') role:Role) { this.check(req); if(!['student','teacher','admin'].includes(role)) throw new BadRequestException('Noto‘g‘ri rol'); if(id===req.user.id&&role!=='admin') throw new BadRequestException('O‘zingizning admin rolingizni o‘zgartira olmaysiz'); return this.users.findByIdAndUpdate(id,{role},{new:true,projection:{passwordHash:0}}); }
 @Delete('users/:id') async deleteUser(@Param('id') id:string,@Req() req:any) { this.check(req); if(id===req.user.id) throw new BadRequestException('O‘z admin akkauntingizni o‘chira olmaysiz'); const user:any=await this.users.findById(id).lean(); if(!user) throw new NotFoundException('Foydalanuvchi topilmadi'); if(user.email===this.config.get<string>('ADMIN_EMAIL')?.trim().toLowerCase()) throw new BadRequestException('Server sozlamasidagi asosiy adminni o‘chirib bo‘lmaydi'); const ownedCourses:any[]=await this.courses.find({teacherId:id},{_id:1}).lean(); const courseIds=ownedCourses.map(c=>String(c._id)); const ownedTests:any[]=await this.tests.find({createdBy:id},{_id:1}).lean(); const testIds=ownedTests.map(t=>String(t._id)); await this.requests.deleteMany({$or:[{userId:id},{courseId:{$in:courseIds}}]}); await this.progress.deleteMany({$or:[{userId:id},{courseId:{$in:courseIds}}]}); await this.attempts.deleteMany({$or:[{userId:id},{testId:{$in:testIds}}]}); await this.courses.deleteMany({teacherId:id}); await this.tests.deleteMany({createdBy:id}); await this.users.deleteOne({_id:id}); return {deleted:true,id}; }
 @Get('courses') coursesList(@Req() req: any) { this.check(req); return this.courses.find().populate('teacherId','name email').lean(); }
 @Get('course-requests') pendingCourses(@Req() req: any) { this.check(req); return this.courses.find({ status: 'pending' }).populate('teacherId','name email').sort({ createdAt: 1 }).lean(); }
 @Delete('courses/:id') async deleteCourse(@Param('id') id:string,@Req() req:any) { this.check(req); const course=await this.courses.findById(id); if(!course) throw new NotFoundException('Kurs topilmadi'); await this.requests.deleteMany({courseId:id}); await this.progress.deleteMany({courseId:id}); await this.courses.deleteOne({_id:id}); return {deleted:true,id}; }
 @Patch('courses/:id/review') async review(@Param('id') id: string, @Req() req: any, @Body() dto: ReviewDto) { this.check(req); return this.courses.findByIdAndUpdate(id,{status:dto.status},{new:true}); }
 @Patch('courses/:id/free') async free(@Param('id') id: string, @Req() req: any, @Body('isPaid') isPaid: boolean) { this.check(req); return this.courses.findByIdAndUpdate(id,{isPaid:!!isPaid},{new:true}); }
 @Get('access-requests') async listRequests(@Req() req: any) { this.check(req); return this.requests.find({status:'pending'}).populate('courseId').populate('userId','name email').lean(); }
 @Get('tests') async listTests(@Req() req:any){this.check(req);return this.tests.find({}, {title:1,level:1,'questions.number':1,createdAt:1}).sort({level:1}).lean().then(rows=>rows.map((t:any)=>({...t,questionCount:t.questions?.length||0,questions:undefined})));}
 @Post('tests/import') async importTests(@Req() req:any,@Body() body:any){this.check(req);const groups=Array.isArray(body?.tests)?body.tests:[body];if(!groups.length)throw new BadRequestException('JSON ichida tests ro‘yxati bo‘lishi kerak');const supported=['A1','A2','B1','B2','C1','C2'];const imported=[];for(const group of groups){if(!supported.includes(group?.level)||!Array.isArray(group?.questions)||!group.questions.length)throw new BadRequestException('Har bir testda level va savollar ro‘yxati bo‘lishi kerak');for(const q of group.questions){if(!Number.isInteger(q.number)||typeof q.question!=='string'||!q.question.trim()||!q.options||!['A','B','C','D'].every(k=>typeof q.options[k]==='string')||!['A','B','C','D'].includes(q.answer))throw new BadRequestException(`Savol formati noto‘g‘ri: ${q.number||'?'}`);}const title=group.title||body.title||`Turk tili ${group.level} testi`;const test=await this.tests.findOneAndUpdate({title,level:group.level,createdBy:req.user.id},{$set:{title,level:group.level,questions:group.questions,published:true,createdBy:req.user.id}}, {upsert:true,new:true,setDefaultsOnInsert:true});imported.push({id:test._id,title:test.title,level:test.level,questionCount:test.questions.length});}return{imported};}
 @Patch('access-requests/:id') async reviewAccess(@Param('id') id: string, @Req() req: any, @Body() dto: AccessReviewDto) { this.check(req); const request: any = await this.requests.findByIdAndUpdate(id,{status:dto.status},{new:true}); if (!request) throw new NotFoundException(); if(dto.status==='approved') await this.courses.findByIdAndUpdate(request.courseId,{$addToSet:{enrolledUsers:request.userId}}); return request; }
}

@Module({ imports:[ConfigModule.forRoot({isGlobal:true}),MongooseModule.forRootAsync({imports:[ConfigModule],inject:[ConfigService],useFactory:(c:ConfigService)=>({uri:c.get('MONGODB_URI','mongodb://127.0.0.1:27017/tilshunos')})}),MongooseModule.forFeature([{name:User.name,schema:UserSchema},{name:Course.name,schema:CourseSchema},{name:AccessRequest.name,schema:AccessRequestSchema},{name:Progress.name,schema:ProgressSchema},{name:LanguageTest.name,schema:LanguageTestSchema},{name:TestAttempt.name,schema:TestAttemptSchema}]),JwtModule.registerAsync({global:true,imports:[ConfigModule],inject:[ConfigService],useFactory:(c:ConfigService)=>({secret:c.get('JWT_SECRET'),signOptions:{expiresIn:c.get('JWT_EXPIRES_IN','7d')}})}),PassportModule.register({defaultStrategy:'jwt'})],controllers:[AuthController,CoursesController,TestsController,AdminController],providers:[AuthService,JwtStrategy]}) export class AppModule {}
