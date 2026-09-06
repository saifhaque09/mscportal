<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use App\Modules\Clients\Models\Firm;
use App\Modules\Users\Models\Invite;
use App\Modules\Users\Models\IndividualStatus;
use App\Modules\Organizations\Models\IndividualUserAssignment;
use App\Modules\Organizations\Models\OrganizationUserAssignment;


class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasApiTokens, HasRoles;

    protected $guard_name = 'web';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'firm_id',
        'guid',
        'first_name',
        'last_name',
        'mobile',
        'status',
        'email',
        'password',
        'meta',
        'last_login_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            // meta holds SIN, DOB, marital/spouse details, and banking info —
            // encrypt at rest rather than storing as plain JSON. Existing
            // plaintext rows are migrated by
            // database/migrations/*_encrypt_existing_user_meta.php.
            'meta' => 'encrypted:array',
        ];
    }

    /**
     * Get the business that owns the User
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function business(): BelongsTo
    {
        return $this->belongsTo(Firm::class, 'firm_id', 'id');
    }

    /**
     * The team (Accountant/Staff, with their per-client role) assigned to
     * this user when acting as a Taxfiler/Individual client.
     */
    public function individualAssignments()
    {
        return $this->hasMany(IndividualUserAssignment::class, 'taxfiler_id');
    }

    /**
     * The business firms this user (an Accountant/Staff) holds an org-role
     * assignment on — the inverse of Firm's roster of assigned staff.
     */
    public function organizationAssignments()
    {
        return $this->hasMany(OrganizationUserAssignment::class, 'user_id');
    }

  public function taxCategories()
{
    return $this->belongsToMany(
        \App\Modules\Individual\Models\TaxCategory::class,
        'user_tax_categories',
        'user_id',
        'tax_category_id'
    )
    ->withPivot('id', 'year')
    ->withTimestamps();
}
public function uploadedTaxDocuments()
{
    return $this->hasMany(TaxFilerDocument::class, 'uploaded_by');
}

public function invites()
{
    return $this->hasMany(Invite::class, 'email', 'email');
}

public function individualStatus(): HasOne
{
    return $this->hasOne(IndividualStatus::class, 'user_id', 'id')
                ->withDefault(['individual_status' => 'disabled']);
}
}
