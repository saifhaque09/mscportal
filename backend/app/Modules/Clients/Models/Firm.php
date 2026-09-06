<?php

namespace App\Modules\Clients\Models;

use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Modules\Clients\Models\Checklist;
use App\Modules\Clients\Models\Invite;
use App\Models\User;
use App\Modules\Clients\Models\Agreement;
use App\Modules\Files\Models\File;
use App\Modules\Deadlines\Models\OrganizationDeadline;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Firm extends Model
{

    use SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'firms';

    /**
     * Specify the attributes that can be mass-assigned
     *
     * @var string
     */
    protected $fillable = [ 'guid', 'status', 'firm_name', 'contact_email', 'contact_mobile', 'province', 'city', 'postal', 'country_name', 'country_code', 'address', 'payment_type', 'weekly_day', 'weekly_month', 'business_account_details', 'gst_number', 'hst_number', 'pst_number', 'business_categories', 'tax_return', 'financial_year_end', 'gst_hst_date', 'tax_returns_due_date', 'logo_file_id', 'meta', 'created_by', 'updated_by'];

    /**
     * Attributes to append to the model's array/JSON form.
     *
     * @var array<int, string>
     */
    protected $appends = ['logo_url'];

    /**
     * Indicates if the model should be timestamped.
     *
     * @var bool
     */
    public $timestamps = true;

    
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'meta' => 'array',
            'business_account_details' => 'array',
            'business_categories' => 'array',
            'tax_return' => 'array',
            'financial_year_end' => 'array',
            'gst_hst_date' => 'array',
        ];
    }


    /**
     * Get all of the checklist for the Firm
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function checklist_items(): HasMany
    {
        return $this->hasMany(Checklist::class, 'firm_id', 'id')->with('files')->withCount('files');
    }

    /**
     * Get all of the users for the Firm
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'firm_id', 'id');
    }

    /**
     * Get all of the invites for the Firm — the pending half of the client
     * roster. An invite row is deleted once accepted (see
     * Passwords::create_password()), at which point the person shows up
     * under users() instead.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function invites(): HasMany
    {
        return $this->hasMany(Invite::class, 'firm_id', 'id');
    }

     /**
     * Get all of the agreements for the application.
     */
    public function agreements(): BelongsToMany
    {
        return $this->belongsToMany(File::class, 'firm_agreements', 'firm_id', 'file_id');
    }

    public function organizationDeadlines(): HasMany
    {
        return $this->hasMany(OrganizationDeadline::class, 'organization_id');
    }

    /**
     * The firm's logo file.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function logo(): BelongsTo
    {
        return $this->belongsTo(File::class, 'logo_file_id');
    }

    /**
     * Signed, temporary URL for the firm's logo (via File::file_path accessor).
     */
    protected function logoUrl(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->logo?->file_path,
        );
    }
}
