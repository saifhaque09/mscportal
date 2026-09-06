<?php
namespace App\Modules\Invoices\Models;
use Illuminate\Database\Eloquent\Model;
class InvoiceItem extends Model { protected $fillable=['description','amount']; protected $casts=['amount'=>'decimal:2']; public function invoice(){return $this->belongsTo(Invoice::class);} }
