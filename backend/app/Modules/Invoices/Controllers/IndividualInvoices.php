<?php
namespace App\Modules\Invoices\Controllers;

use App\Http\Controllers\BaseController;
use App\Models\User;
use App\Modules\Invoices\Models\IndividualInvoice;
use App\Modules\Payments\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Mpdf\Mpdf;

class IndividualInvoices extends BaseController
{
    public function __construct()
    {
        IndividualInvoice::whereIn('status', ['issued', 'overdue'])
            ->whereDate('issued_at', '<', now()->subDays(15)->toDateString())
            ->where('status', 'issued')
            ->update(['status' => 'overdue']);
    }
    private function staff($u): void { abort_unless($u->hasAnyRole(['Admin','Accountant']) || $u->can('firms.manage'), 403); }
    private function clientScope($q, $u) { return $u->hasAnyRole(['Admin','Accountant']) || $u->can('firms.manage') ? $q : $q->where('client_id', $u->id); }

    public function index(Request $r) { $q=$this->clientScope(IndividualInvoice::with('client:id,first_name,last_name,email'),$r->user()); if($r->filled('client_id'))$q->where('client_id',$r->integer('client_id')); if($r->filled('tax_year'))$q->where('tax_year',$r->integer('tax_year')); return response()->json(['invoices'=>$q->latest('issued_at')->get()]); }
    public function store(Request $r) { $this->staff($r->user()); $d=$r->validate(['client_id'=>'required|exists:users,id','tax_year'=>'required|digits:4','description'=>'required|string|max:255','amount'=>'required|numeric|min:0.01','hst_rate'=>'required|numeric|min:0|max:100','issued_at'=>'required|date','due_at'=>'required|date|after_or_equal:issued_at']); $sub=(float)$d['amount'];$hst=round($sub*$d['hst_rate']/100,2); $invoice=IndividualInvoice::create(array_merge($d,['created_by'=>$r->user()->id,'number'=>'T4-'.date('Y').'-'.str_pad((string)(IndividualInvoice::max('id')+1),5,'0',STR_PAD_LEFT),'service_type'=>'T4 processing','subtotal'=>$sub,'hst_amount'=>$hst,'total'=>$sub+$hst,'status'=>'issued'])); return response()->json(['invoice'=>$invoice->load('client:id,first_name,last_name,email')],201); }
    public function payment(Request $r, IndividualInvoice $invoice) { $this->staff($r->user()); $d=$r->validate(['amount'=>'required|numeric','payment_method'=>'required|in:e_transfer,cash','transaction_id'=>'nullable|string|max:255','payment_date'=>'nullable|date','remarks'=>'nullable|string|max:500']); abort_if($invoice->status==='paid'||(float)$d['amount']!==(float)$invoice->total,422,'Payment must match the invoice total.'); DB::transaction(function()use($r,$d,$invoice){$invoice->update(['status'=>'paid','paid_at'=>$d['payment_date']??now(),'payment_method'=>$d['payment_method'],'transaction_id'=>$d['transaction_id']??null]); Payment::create(['firm_id'=>null,'year'=>$invoice->tax_year,'admin_id'=>$r->user()->id,'client_id'=>$invoice->client_id,'amount'=>$invoice->total,'payment_method'=>$d['payment_method']==='e_transfer'?'e_payment':'cash','transaction_id'=>$d['transaction_id']??null,'status'=>'paid','payment_date'=>$d['payment_date']??now(),'remarks'=>$d['remarks']??('Payment for '.$invoice->number)]);}); return response()->json(['invoice'=>$invoice->fresh('client'),'receipt_number'=>'RCT-'.str_pad((string)$invoice->id,6,'0',STR_PAD_LEFT)]); }
    public function status(Request $r, IndividualInvoice $invoice) { $this->staff($r->user()); $d=$r->validate(['status'=>'required|in:issued,paid,overdue,cancelled']); $invoice->update(['status'=>$d['status'],'paid_at'=>$d['status']==='paid'?($invoice->paid_at??now()):null]); return response()->json(['invoice'=>$invoice->fresh('client')]); }
    public function pdf(Request $r, IndividualInvoice $invoice, bool $receipt=false) { $this->clientScope(IndividualInvoice::query(),$r->user())->whereKey($invoice->id)->firstOrFail(); abort_if($receipt && $invoice->status!=='paid',404); $invoice->load('client'); $title=$receipt?'Payment Receipt':'Invoice'; $html='<style>body{font-family:dejavusans;color:#1f2937}h1{color:#123b5d}</style><h1>'.$title.' '.e($invoice->number).'</h1><p><strong>Client:</strong> '.e($invoice->client->first_name.' '.$invoice->client->last_name).'</p><p><strong>T4 tax year:</strong> '.e($invoice->tax_year).'</p><p>'.e($invoice->description).'</p><p><strong>Amount:</strong> $'.number_format($invoice->total,2).' CAD</p>'.($receipt?'<p><strong>Payment method:</strong> '.e($invoice->payment_method).'<br>Paid: '.$invoice->paid_at->format('Y-m-d').'</p>':'<p>Issued: '.$invoice->issued_at->format('Y-m-d').' &nbsp; Due: '.$invoice->due_at->format('Y-m-d').'</p>').'<p>Subtotal: $'.number_format($invoice->subtotal,2).' CAD<br>HST ('.rtrim(rtrim(number_format($invoice->hst_rate,2,'.',''),'0'),'.').'%), $'.number_format($invoice->hst_amount,2).' CAD<br><strong>Total: $'.number_format($invoice->total,2).' CAD</strong></p>'; $tempDir=storage_path('app/mpdf'); if(!is_dir($tempDir)) mkdir($tempDir,0755,true); $pdf=new Mpdf(['tempDir'=>$tempDir]);$pdf->WriteHTML($html);return response($pdf->Output('','S'),200,['Content-Type'=>'application/pdf','Content-Disposition'=>'attachment; filename="'.$title.'-'.$invoice->number.'.pdf"']); }
}
