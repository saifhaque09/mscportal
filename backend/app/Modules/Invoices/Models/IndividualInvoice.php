<?php
namespace App\Modules\Invoices\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class IndividualInvoice extends Model
{
    protected $fillable = ['client_id','created_by','number','tax_year','service_type','description','subtotal','hst_rate','hst_amount','total','issued_at','due_at','status','paid_at','payment_method','transaction_id'];
    protected $casts = ['issued_at'=>'date','due_at'=>'date','paid_at'=>'datetime','subtotal'=>'decimal:2','hst_rate'=>'decimal:2','hst_amount'=>'decimal:2','total'=>'decimal:2'];
    public function client() { return $this->belongsTo(User::class, 'client_id'); }
    public function creator() { return $this->belongsTo(User::class, 'created_by'); }
}
