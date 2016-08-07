port module App exposing (..)

import ColorSync
import Html exposing (Html, div, img, a, text, br)
import Html.App
import Html.Attributes exposing (src, href, target)
import Random
import String
import Navigation
import Routing exposing (Route)


type alias AppModel =
    { colorSyncModel : ColorSync.Model
    , sessionId : String
    , host : String
    , route : Routing.Route
    }


initialModel : AppModel
initialModel =
    { colorSyncModel = ColorSync.initialModel
    , sessionId = ""
    , host = ""
    , route = Routing.NotFound
    }


getSessionIdFromRoute : Route -> String
getSessionIdFromRoute route =
    case route of
        Routing.SessionRoute host sessionId ->
            sessionId

        Routing.MainRoute host ->
            ""

        Routing.NotFound ->
            ""


getHostFromRoute : Route -> String
getHostFromRoute route =
    case route of
        Routing.SessionRoute host sessionId ->
            host

        Routing.MainRoute host ->
            host

        Routing.NotFound ->
            ""


init : Result String Route -> ( AppModel, Cmd Msg )
init result =
    let
        route = Routing.routeFromResult result

        currentSessionId =
            getSessionIdFromRoute route

        host =
            getHostFromRoute route
    in
        ( { initialModel | host = host, route = route }
        , if currentSessionId == "" then
            Random.generate GenerateSessionId (Random.int 1 10000)
          else
            sessionId ( currentSessionId, False )
        )


type Msg
    = ColorSyncMsg ColorSync.Msg
    | ChangeColorFromPort ColorSync.Model
    | GenerateSessionId Int


getSessionQrCodeUrl : String -> String -> String
getSessionQrCodeUrl host sessionId =
    (String.concat
        [ "http://chart.apis.google.com/chart?chs=200x200&cht=qr&chld=|1&chl="
        , "https%3A%2F%2F"
        , host
        , "%2F"
        , sessionId
        ]
    )


getSessionConnectUrl : String -> String -> String
getSessionConnectUrl host sessionId =
    (String.concat
        [ "http://"
        , host
        , "/"
        , sessionId
        ]
    )


view : AppModel -> Html Msg
view model =
    case model.route of
        Routing.SessionRoute host sessionId ->
            div []
                [ Html.App.map ColorSyncMsg (ColorSync.view model.colorSyncModel)
                ]

        Routing.MainRoute host ->
            div []
                [ Html.App.map ColorSyncMsg (ColorSync.view model.colorSyncModel)
                , img [ src (getSessionQrCodeUrl model.host model.sessionId) ] []
                , br [] []
                , a [ href (getSessionConnectUrl model.host model.sessionId), target "_blank" ]
                    [ text (getSessionConnectUrl model.host model.sessionId)
                    ]
                ]

        Routing.NotFound ->
            div []
                [ text "Route not found"
                ]



update : Msg -> AppModel -> ( AppModel, Cmd Msg )
update message model =
    case message of
        GenerateSessionId newSessionId ->
            ( { model | sessionId = toString newSessionId }, sessionId ( (toString newSessionId), True ) )

        ChangeColorFromPort newColor ->
            update (ColorSyncMsg (ColorSync.ChangeColor newColor)) model

        ColorSyncMsg subMsg ->
            case subMsg of
                ColorSync.ChangedColor newColor ->
                    ( model, changedColor newColor )

                _ ->
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


port changedColor : ColorSync.Model -> Cmd msg


port sessionId : ( String, Bool ) -> Cmd msg


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
