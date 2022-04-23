<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Carbon\Carbon;


class FirebaseController extends Controller
{
    //

    protected $database;

    public function __construct()
    {
        $this->database = app('firebase.database');
    }

    public function index(){
        $contributors =  $this->database->getReference('data/');
        $activeDeveloper = $contributors->orderByChild('type')->equalTo('Active Developers');
        return response()->json(['status'=>200, 'message'=>'Contributors fetched successfully','contributors'=>['activeDevelopers'=>$activeDeveloper]]);
    }

    public function store(Request $request){
        $messages = [
            'in' => 'The :attribute must be one of the following values: :values',
            'min' => 'The :attribute does not have minimum length :min',
            'array' => 'The :attribute must be an array'
        ];
        $validator = Validator::make($request->all(),[
            'type' => [
                'required',
                Rule::in(['Active Developers', 'Contributors of Badhan', 'Legacy Developers']),
                ],
            'name' => [
                'required',
                'min:3'
            ],
            'calender' => [
                'required',
                'min:3'
            ],
            'contribution' => [
                'required',
                'array',
                'min:1'
            ],
            "contribution.*" => [
                'min:3',
            ],
            'links' => [
                'required',
                'array',
                'min:1'
            ],
            "links.*.color" => [
                'required',
                'min:3',
            ],
            "links.*.icon" => [
                'required',
                'min:3',
            ],
            "links.*.link" => [
                'required',
                'url',
            ],
        ],$messages);
        $id = Carbon::now()->timestamp;
        if ($validator->fails()) {
            return response()->json(['status'=>400,'data'=>$validator->errors()]);
        }

        $this->database->getReference('data/'.$id)
            ->set($validator->valid());
        $validatedInput = $validator->valid();
        $validatedInput["id"] = $id;
        return response()->json(['status'=>201,'message'=>'Contributor created successfully','contributor'=>$validatedInput]);
    }

    public function update($id){
        $this->database->getReference('data/'.$id)
            ->set('Example Task');
        $reference = $this->database->getReference('data');
        return response()->json(['status'=>200,'data'=>$reference->getvalue()]);
    }

    public function updateImage(){

    }

    public function destroy(Request $input){

        $this->database->getReference('data/'.$input->id)->remove();
        return response()->json(['status'=>200]);
    }

}
