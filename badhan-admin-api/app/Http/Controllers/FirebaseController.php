<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
//use Illuminate\Support\Facades\Storage;
use Google\Cloud\Storage\StorageClient;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Carbon\Carbon;
use PhpOption\None;


class FirebaseController extends Controller
{
    //

    protected $database;

    private $messages;

    private $rules;

    private $blankImage = 'https://www.pngitem.com/pimgs/m/256-2560200_username-conversion-account-icon-png-transparent-png.png';

    public function __construct()
    {
        $this->database = app('firebase.database');
        $this->messages = [
            'in' => 'The :attribute must be one of the following values: :values',
            'min' => 'The :attribute does not have minimum length :min',
            'array' => 'The :attribute must be an array',
            'regex' => 'The :attribute didnot match regex pattern :pattern'
        ];

        $this->rules = [
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
            'links.*.color' => [
                'required',
                'min:3',
            ],
            'links.*.icon' => [
                'required',
                'min:3',
            ],
            'links.*.link' => [
                'required',
                'url',
            ],
        ];
    }

    public function index(){
            $contributors = $this->database->getReference('data/')->getvalue();
            if(!$contributors){
                return response()->json(['status' => 200, 'message' => 'Contributors fetched successfully', 'contributors' => ['activeDevelopers' => [], 'contributorsOfBadhan' => [], 'legacyDevelopers' => []]],200);
            }
            $activeDevelopers = [];
            $contributorsOfBadhan = [];
            $legacyDevelopers = [];
            $keys = array_keys($contributors);
            foreach ($contributors as $contributor) {
                $contributor['id'] = array_shift($keys);
                if ($contributor['type'] == 'Active Developers') {
                    $activeDevelopers[] = $contributor;
                } else if ($contributor['type'] == 'Contributors of Badhan') {
                    $contributorsOfBadhan[] = $contributor;
                } else {
                    $legacyDevelopers[] = $contributor;
                };
            }
            return response()->json(['status' => 200, 'message' => 'Contributors fetched successfully', 'contributors' => ['activeDevelopers' => $activeDevelopers, 'contributorsOfBadhan' => $contributorsOfBadhan, 'legacyDevelopers' => $legacyDevelopers]],200);
    }

    public function store(Request $request){
        $validator = Validator::make( $request->all(), $this->rules , $this->messages);
        $id = Carbon::now()->timestamp;
        if ($validator->fails()) {
            return response()->json(['status'=>400,'message'=>$validator->errors()],400);
        }
        $validatedInput = $validator->valid();
        $validatedInput["imageUrl"]=$this->blankImage;
        $this->database->getReference('data/'.$id)
            ->set($validatedInput);
        $validatedInput["id"] = $id;
        return response()->json(['status'=>201,'message'=>'Contributor created successfully','contributor'=>$validatedInput],201);
    }

    public function update(Request $request,$id){
        $validator = Validator::make( $request->all(), $this->rules , $this->messages);
        if ($validator->fails()) {
            return response()->json(['status'=>400,'message'=>$validator->errors()],400);
        }
        $contributors = $this->database->getReference('data/')->getvalue();
        $keys = array_keys($contributors);
        if (!in_array($id, $keys)) {
            return response()->json(['status'=>404,'message'=>'Contributor id not found'],404);
        }
        $this->database->getReference('data/'.$id)
            ->update($validator->valid());
        $reference = $this->database->getReference('data/'.$id)->getvalue();
        $reference['id']=$id;
        return response()->json(['status'=>200, 'message'=>'Contributor edited successfully','contributor'=>$reference],200);
    }

    public function storeImage(Request $input){
        $validator = Validator::make( $input->all(), [
                'image' => ["required","mimes:jpeg,jpg,png"]
            ], $this->messages);
        if ($validator->fails()) {
            return response()->json(['status'=>400,'message'=>$validator->errors()],400);
        }
//        $name= $input->id. ".".$input->image->getClientOriginalExtension();
        $name= $input->id. ".png";
        $filePath = 'badhan-admin-api/'.$name;
        $storage= app('firebase.storage');
        $storage->getBucket()->upload(fopen($input->image, 'r'),['name' => $filePath]);
        $url = 'https://firebasestorage.googleapis.com/v0/b/badhan-buet.appspot.com/o/badhan-admin-api%2F'.$name.'?alt=media';
        $this->database->getReference('data/'.$input->id.'/imageUrl')
            ->set($url);
        return response()->json(['status'=>200,'message'=>'Image successfully updated','url'=>$url],200);
        // if you want to use gcs
//        $url= $storage->ref($name)->getDownloadURL();
//        $disk = Storage::disk('gcs')->put($filePath, file_get_contents($input->image));
//        $gcs = Storage::disk('gcs');
//        $url = $gcs->url('badhan-admin-api/'.$input->id.".".$input->image->getClientOriginalExtension());

    }

    public function destroy(Request $input){
        $contributors = $this->database->getReference('data/')->getvalue();
        $keys = array_keys($contributors);
        if (!in_array($input->id, $keys)) {
            return response()->json(['status'=>404,'message'=>'Contributor id not found'],404);
        }
        $singleContributor = $this->database->getReference('data/'.$input->id)->getValue();
        if($singleContributor['imageUrl']!== $this->blankImage){
            $storage= app('firebase.storage');
            $filePath='badhan-admin-api/'.$input->id.'.png';
            $storage->getBucket()->object($filePath)->delete();
        }
        $this->database->getReference('data/'.$input->id)->remove();
        return response()->json(['status'=>200,'message'=>'Contributor deleted successfully'],200);
    }

    public function indexFrontendSettings(){
        $reference = $this->database->getReference('frontendSettings')->getvalue();
        return response()->json(['status'=>200,'message'=>'frontend settings fetched successfully','settings'=>$reference],200);
    }

    public function updateFrontendSettings(Request $request){
        $validator = Validator::make( $request->all(), [
            'backendBaseURL' => [
                'required',
                'url',
            ],
            'backendTestBaseURL' => [
                'required',
                'url',
            ],
            'version' =>[
                'required',
                'regex:/\d+\.\d+\.\d+/u'
            ]
        ], $this->messages);
        if ($validator->fails()) {
            return response()->json(['status'=>400,'message'=>$validator->errors()],400);
        }
        $this->database->getReference('frontendSettings')
            ->update($validator->valid());
        return response()->json(['status'=>200,'message'=>'frontend settings edited successfully'],200);
    }

}
