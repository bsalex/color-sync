module IceServersProvider exposing (..)

import Task
import Http
import Json

type Msg
    = FetchSucceed String
    | FetchFail Http.Error
    | GotIceServers String


update : Msg -> Cmd Msg
update msg =
    case msg of
        FetchSucceed result ->
            Task.perform (\_ -> Debug.crash "This failure cannot happen.") identity (Task.succeed (GotIceServers (Debug.log "ice servers " result)))

        _ ->
            Cmd.none


getIceServers : Cmd Msg
getIceServers =
  let
    url =
      "https://service.xirsys.com/ice?ident=bsalex&secret=280b50ac-5b50-11e6-8b91-4bca927191f6&domain=display-sync.heroku.com&application=default&room=default&secure=1"
  in
    Task.perform FetchFail FetchSucceed (Http.get decodeIceServers url)

decodeIceServers : Json.Decoder string
decodeIceServers =
  Json.at ["d", "iceServers"] Json.string
