port module App exposing (..)

import ColorSync
import Html exposing (Html, div, img)
import Html.App
import Html.Attributes exposing (src)
import Random
import String
import Navigation
import Routing exposing (Route)

type alias AppModel =
    { colorSyncModel : ColorSync.Model
    , sessionId : String
    }

initialModel : AppModel
initialModel =
    { colorSyncModel = ColorSync.initialModel
    , sessionId = ""
    }

-- init : ( AppModel, Cmd Msg )
-- init =
--     ( initialModel, Random.generate GenerateSessionId (Random.int 1 10000) )

getSessionIdFromRoute : Route -> String
getSessionIdFromRoute route = case route of
    Routing.SessionRoute sessionId ->
      sessionId
    Routing.MainRoute ->
      ""

init : Result String Route -> ( AppModel, Cmd Msg )
init result =
    let
        currentSessionId = getSessionIdFromRoute (Routing.routeFromResult (Debug.log "result" result))
    in
        ( initialModel, if currentSessionId == "" then Random.generate GenerateSessionId (Random.int 1 10000) else sessionId (currentSessionId, False) )


type Msg
  = ColorSyncMsg ColorSync.Msg
  | ChangeColorFromPort (ColorSync.Model)
  | GenerateSessionId Int


getSessionQrCodeUrl : String -> String
getSessionQrCodeUrl sessionId = ( String.concat [ "http://chart.apis.google.com/chart?chs=200x200&cht=qr&chld=|1&chl="
                                                , "https%3A%2F%2Fdisplay-sync.herokuapp.com%2F%23s%2F"
                                                , sessionId
                                                ] )

view : AppModel -> Html Msg
view model =
    div []
    [ Html.App.map ColorSyncMsg (ColorSync.view model.colorSyncModel)
    , img [ src (getSessionQrCodeUrl model.sessionId) ] []
    ]


update : Msg -> AppModel -> ( AppModel, Cmd Msg )
update message model =
    case message of
        GenerateSessionId newSessionId ->
            ( { model | sessionId = Debug.log "session" (toString newSessionId) }, sessionId ((toString newSessionId), True) )

        ChangeColorFromPort newColor ->
            update (ColorSyncMsg (ColorSync.ChangeColor newColor)) model

        ColorSyncMsg subMsg ->
            let
                ( updatedColorSyncModel, colorSyncCmd ) =
                    ColorSync.update subMsg model.colorSyncModel
            in
                ( { model | colorSyncModel = updatedColorSyncModel }, Cmd.map ColorSyncMsg colorSyncCmd )

urlUpdate : Result String Route -> AppModel -> ( AppModel, Cmd Msg )
urlUpdate result model =
    let
        currentRoute =
            Routing.routeFromResult result
    in
        ( model, Cmd.none )

port changeColor : (ColorSync.Model -> msg) -> Sub msg
port sessionId : (String, Bool) -> Cmd msg

subscriptions : AppModel -> Sub Msg
subscriptions model =
    changeColor ChangeColorFromPort

main : Program Never
main =
    Navigation.program Routing.parser
        { init = init
        , view = view
        , update = update
        , urlUpdate = urlUpdate
        , subscriptions = subscriptions
        }
