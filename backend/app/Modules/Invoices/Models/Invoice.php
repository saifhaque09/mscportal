<?php
namespace App\Modules\Invoices\Models;
use App\Models\User; use App\Modules\Clients\Models\Firm; use Illuminate\Database\Eloquent\Model;
class Invoice extends Model { protected $fillable=['firm_id','created_by','number','issued_at','due_at','subtotal','hst_rate','hst_amount','total','source','status','paid_at']; protected $casts=['issued_at'=>'date','due_at'=>'date','paid_at'=>'datetime','subtotal'=>'decimal:2','hst_rate'=>'decimal:2','hst_amount'=>'decimal:2','total'=>'decimal:2']; public function items(){return $this->hasMany(InvoiceItem::class);} public function firm(){return $this->belongsTo(Firm::class);} public function creator(){return $this->belongsTo(User::class,'created_by');} }
