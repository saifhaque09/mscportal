<?php

namespace App\Modules\Organizations\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class IndividualUserAssignment extends Model
{
    protected $table = 'individual_user_assignments';

    protected $fillable = ['taxfiler_id', 'user_id', 'organization_role_id'];

    public $timestamps = true;

    public function taxfiler()
    {
        return $this->belongsTo(User::class, 'taxfiler_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function organizationRole()
    {
        return $this->belongsTo(OrganizationRole::class, 'organization_role_id');
    }
}
