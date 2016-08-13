module IceServersProvider exposing (..)

import Task
import Http
import Json.Decode as Json
import Json.Decode exposing ((:=))

type Msg
    = FetchSucceed (List IceServer)
    | FetchFail Http.Error

type alias IceServer =
    { url : String
    , credential : Maybe String
    , username : Maybe String
    }

iceServerDecoder : Json.Decoder (List IceServer)
iceServerDecoder =
    Json.at ["d", "iceServers"] (Json.list (Json.object3 IceServer ("url" := Json.string) (Json.maybe ("credential" := Json.string)) (Json.maybe ("username" := Json.string))))

getIceServers : String -> Cmd Msg
getIceServers domain =
  let
    url =
      "https://service.xirsys.com/ice?ident=bsalex&secret=280b50ac-5b50-11e6-8b91-4bca927191f6&domain=" ++ domain ++ "&application=default&room=default&secure=1"
  in
    Task.perform FetchFail FetchSucceed (Http.get iceServerDecoder url)
