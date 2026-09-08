<?php
namespace App\Modules\Chat\Controllers;
use App\Http\Controllers\BaseController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
class ChatController extends BaseController {
 public function contacts(Request $r){return ['contacts'=>DB::table('users')->select('id','first_name','last_name','email')->where('id','!=',$r->user()->id)->orderBy('first_name')->get()];}
 public function inbox(Request $r){$ids=DB::table('chat_conversation_participants')->where('user_id',$r->user()->id)->pluck('conversation_id');return ['user'=>$r->user()->id,'conversations'=>DB::table('chat_conversations')->whereIn('id',$ids)->where('status','ACTIVE')->orderByDesc('updated_at')->get()];}
 public function create(Request $r){$data=$r->validate(['type'=>'required|in:ONE_TO_ONE,GROUP','name'=>'nullable|string|max:150','client_id'=>'nullable|integer','participant_ids'=>'required|array|min:1','participant_ids.*'=>'integer']);$id=DB::table('chat_conversations')->insertGetId(['type'=>$data['type'],'name'=>$data['name']??null,'client_id'=>$data['client_id']??null,'created_by'=>$r->user()->id,'created_at'=>now(),'updated_at'=>now()]);$members=array_unique(array_merge([$r->user()->id],$data['participant_ids']));foreach($members as $uid)DB::table('chat_conversation_participants')->insert(['conversation_id'=>$id,'user_id'=>$uid,'role'=>$uid===$r->user()->id?'OWNER':'MEMBER','created_at'=>now(),'updated_at'=>now()]);return $this->show($r,$id);}
 public function show(Request $r,$id){$this->authorized($r,$id);$c=DB::table('chat_conversations')->where('id',$id)->firstOrFail();$c->participants=DB::table('chat_conversation_participants')->where('conversation_id',$id)->get();$c->messages=DB::table('chat_messages')->where('conversation_id',$id)->orderBy('created_at')->get();return $c;}
 public function message(Request $r,$id){$this->authorized($r,$id);$data=$r->validate(['message_text'=>'required|string|max:10000','reply_to_id'=>'nullable|integer']);$mid=DB::table('chat_messages')->insertGetId(['conversation_id'=>$id,'sender_id'=>$r->user()->id,'message_text'=>$data['message_text'],'reply_to_id'=>$data['reply_to_id']??null,'status'=>'SENT','created_at'=>now(),'updated_at'=>now()]);DB::table('chat_conversations')->where('id',$id)->update(['updated_at'=>now()]);return DB::table('chat_messages')->where('id',$mid)->first();}
 private function authorized(Request $r,$id){abort_unless(DB::table('chat_conversation_participants')->where(['conversation_id'=>$id,'user_id'=>$r->user()->id,'status'=>'ACTIVE'])->exists(),403);}
}
