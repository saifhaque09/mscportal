<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up(): void {
  Schema::create('chat_conversations', function(Blueprint $t){$t->id();$t->enum('type',['ONE_TO_ONE','GROUP']);$t->string('name')->nullable();$t->foreignId('client_id')->nullable()->constrained('users')->nullOnDelete();$t->foreignId('created_by')->constrained('users')->cascadeOnDelete();$t->string('linked_record_type')->nullable();$t->unsignedBigInteger('linked_record_id')->nullable();$t->enum('status',['ACTIVE','ARCHIVED'])->default('ACTIVE');$t->timestamps();$t->index(['client_id','status']);});
  Schema::create('chat_conversation_participants', function(Blueprint $t){$t->id();$t->foreignId('conversation_id')->constrained('chat_conversations')->cascadeOnDelete();$t->foreignId('user_id')->constrained('users')->cascadeOnDelete();$t->enum('role',['OWNER','ADMIN','MEMBER'])->default('MEMBER');$t->enum('status',['ACTIVE','LEFT'])->default('ACTIVE');$t->timestamps();$t->unique(['conversation_id','user_id']);});
  Schema::create('chat_messages', function(Blueprint $t){$t->id();$t->foreignId('conversation_id')->constrained('chat_conversations')->cascadeOnDelete();$t->foreignId('sender_id')->constrained('users')->restrictOnDelete();$t->text('message_text');$t->foreignId('reply_to_id')->nullable()->constrained('chat_messages')->nullOnDelete();$t->enum('status',['SENT','DELIVERED','READ','EDITED','REMOVED','FAILED'])->default('SENT');$t->timestamps();$t->index(['conversation_id','created_at']);});
  Schema::create('chat_message_reads', function(Blueprint $t){$t->id();$t->foreignId('message_id')->constrained('chat_messages')->cascadeOnDelete();$t->foreignId('user_id')->constrained('users')->cascadeOnDelete();$t->timestamp('read_at')->useCurrent();$t->unique(['message_id','user_id']);});
  Schema::create('chat_notifications', function(Blueprint $t){$t->id();$t->foreignId('user_id')->constrained('users')->cascadeOnDelete();$t->foreignId('conversation_id')->constrained('chat_conversations')->cascadeOnDelete();$t->foreignId('message_id')->nullable()->constrained('chat_messages')->nullOnDelete();$t->enum('type',['NEW_MESSAGE','MESSAGE_MENTION','CONVERSATION_UPDATE']);$t->enum('status',['UNREAD','READ'])->default('UNREAD');$t->timestamp('read_at')->nullable();$t->timestamps();$t->index(['user_id','status','created_at']);});
 }
 public function down(): void { Schema::dropIfExists('chat_notifications');Schema::dropIfExists('chat_message_reads');Schema::dropIfExists('chat_messages');Schema::dropIfExists('chat_conversation_participants');Schema::dropIfExists('chat_conversations'); }
};
