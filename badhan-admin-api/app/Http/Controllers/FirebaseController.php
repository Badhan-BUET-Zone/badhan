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
        return response()->json(['status'=>200,'data'=>$reference->getvalue()]);
    }

    public function store(){
        $this->database->getReference('data/')
            ->set([
                'mir' => 'Example Task',
                'turja'=>'hkhggv',
            ]);
        $reference = $this->database->getReference('data');
        return response()->json(['status'=>200,'data'=>$reference->getvalue()]);
    }

    public function update($id){
        $this->database->getReference('data/'.$id)
            ->set('Example Task');
        $reference = $this->database->getReference('data');
        return response()->json(['status'=>200,'data'=>$reference->getvalue()]);
    }

    public function updateImage(){

    }

    public function destroy(Request $request, $id){

        $this->database->getReference('data/'.$id)->remove();
        return response()->json(['status'=>200]);
    }

}
