<?php

namespace App\Modules\Organizations\Models;

use App\Models\User;
use App\Modules\Clients\Models\Firm;
use Illuminate\Database\Eloquent\Model;

class OrganizationUserAssignment extends Model
{
    protected $table = 'organization_user_assignments';

    protected $fillable = ['firm_id', 'user_id', 'organization_role_id'];

    public $timestamps = true;

    public function firm()
    {
        return $this->belongsTo(Firm::class, 'firm_id');
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
