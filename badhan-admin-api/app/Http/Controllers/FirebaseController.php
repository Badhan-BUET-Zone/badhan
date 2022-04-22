<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class FirebaseController extends Controller
{
    //

    protected $database;

    public function __construct()
    {
        $this->database = app('firebase.database');
    }

    public function index(){
        $reference =  $this->database->getReference('data/');
        dd($reference->getvalue());
    }

}
